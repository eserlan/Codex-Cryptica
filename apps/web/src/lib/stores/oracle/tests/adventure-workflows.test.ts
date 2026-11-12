import { afterEach, describe, expect, it, vi } from "vitest";
import { AdventureOpening } from "../adventure-opening";
import { AdventureLifecycle } from "../adventure-lifecycle";
import { AdventureActions } from "../adventure-actions";
import { AdventureRolls } from "../adventure-rolls";
import { AdventureTools } from "../adventure-tools";
import { proposedSession } from "../adventure-session";
import {
  completeProposal,
  createAdventureRuntime,
  rollProposal,
  startInput,
} from "./adventure-fixtures";

afterEach(() => vi.restoreAllMocks());

describe("AdventureOpening", () => {
  it("creates and commits the opening through injected services", async () => {
    const { runtime, state } = createAdventureRuntime();
    const opening = new AdventureOpening(runtime);
    await opening.start(startInput);
    expect(state.session?.turns).toHaveLength(1);
    expect(state.phase).toBe("ready");
    expect(state.starting).toBe(false);
  });

  it("classifies permission failures and clears an incomplete opening", async () => {
    const { runtime, state, deps } = createAdventureRuntime();
    vi.spyOn(deps.generation, "generate").mockRejectedValue(
      new DOMException("denied", "NotAllowedError"),
    );
    await new AdventureOpening(runtime).start(startInput);
    expect(state.session).toBeNull();
    expect(state.errorCause).toBe("storage-permission");
    expect(state.starting).toBe(false);
  });
});

describe("AdventureLifecycle", () => {
  it("refreshes an opened session before granting write access", async () => {
    const { runtime, state, deps } = createAdventureRuntime();
    const loaded = state.session!;
    const load = vi
      .spyOn(deps.repository, "load")
      .mockResolvedValue({ condition: "normal", session: loaded });
    await new AdventureLifecycle(runtime).open(loaded.vaultId, loaded.id);
    expect(load).toHaveBeenCalledTimes(2);
    expect(state.session).toBe(loaded);
    expect(state.readOnly).toBe(false);
    expect(state.lease?.sessionId).toBe(loaded.id);
  });

  it("opens archived sessions without acquiring control", async () => {
    const { runtime, state, deps } = createAdventureRuntime();
    const archived = { ...state.session!, status: "archived" as const };
    vi.spyOn(deps.repository, "load").mockResolvedValue({
      condition: "normal",
      session: archived,
    });
    const acquire = vi.spyOn(deps.authority, "acquire");
    await new AdventureLifecycle(runtime).open(archived.vaultId, archived.id);
    expect(state.readOnly).toBe(true);
    expect(acquire).not.toHaveBeenCalled();
  });

  it("stops waiting for a held lease at the injected clock deadline", async () => {
    const { runtime, state, deps } = createAdventureRuntime();
    state.readOnly = true;
    vi.spyOn(deps.repository, "load").mockResolvedValue({
      condition: "normal",
      session: state.session!,
    });
    vi.spyOn(deps.authority, "acquire").mockResolvedValue({
      ok: false,
      reason: "held",
    } as any);
    vi.spyOn(globalThis, "setTimeout").mockImplementation(((
      callback: TimerHandler,
    ) => {
      if (typeof callback === "function") callback();
      return 0;
    }) as typeof setTimeout);
    const now = vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(11_000);

    const tookControl = await new AdventureLifecycle(runtime, undefined, {
      now,
    }).tryTakeControl();

    expect(tookControl).toBe(false);
    expect(now).toHaveBeenCalledTimes(2);
    expect(deps.authority.acquire).toHaveBeenCalledOnce();
  });

  it("calls the injected roll recovery after opening a recorded outcome", async () => {
    const { runtime, state, deps } = createAdventureRuntime();
    const pending = proposedSession(
      state.session!,
      rollProposal,
      runtime.newTurnMetadata("Cross"),
      "roll",
    );
    // Loading already validated records is the repository's responsibility.
    const recorded = {
      ...pending,
      pendingRoll: {
        ...pending.pendingRoll!,
        suppliedOutcome: { kind: "numeric" as const, value: 12 },
      },
    };
    vi.spyOn(deps.repository, "load").mockResolvedValue({
      condition: "normal",
      session: recorded,
    } as any);
    const resolve = vi.fn(async () => {});
    await new AdventureLifecycle(runtime, resolve).open(
      recorded.vaultId,
      recorded.id,
    );
    expect(resolve).toHaveBeenCalledOnce();
    expect(state.phase).toBe("ready-to-resolve");
  });
});

describe("AdventureActions", () => {
  it("commits suggested actions and clears the composer after persistence", async () => {
    const { runtime, state } = createAdventureRuntime();
    await new AdventureActions(runtime).submitSuggestedAction(
      "Follow the road",
    );
    expect(state.session?.turns[0]?.playerAction).toBe("Follow the road");
    expect(state.draft).toBe("");
    expect(state.phase).toBe("ready");
  });

  it("retains the original session and input when persistence fails", async () => {
    const { runtime, state, deps } = createAdventureRuntime();
    const original = state.session;
    vi.spyOn(deps.repository, "save").mockResolvedValue({
      ok: false,
      error: new Error("write-failed"),
    } as any);
    await new AdventureActions(runtime).submitAction("Follow the road");
    expect(state.session).toBe(original);
    expect(state.draft).toBe("Follow the road");
    expect(state.errorMessage).toBe("write-failed");
  });
});

describe("AdventureRolls", () => {
  it("persists a supplied outcome before resolving it", async () => {
    const { runtime, state, deps } = createAdventureRuntime();
    state.session = proposedSession(
      state.session!,
      rollProposal,
      runtime.newTurnMetadata("Cross"),
      "roll",
    );
    const save = vi.spyOn(deps.repository, "save");
    await new AdventureRolls(runtime).recordRollOutcome({
      kind: "numeric",
      value: 15,
    });
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[0][1].pendingRoll?.suppliedOutcome).toMatchObject({
      value: 15,
    });
    expect(state.session?.pendingRoll).toBeNull();
    expect(state.session?.turns).toHaveLength(1);
  });

  it("retains a recorded result after an invalid resolution proposal", async () => {
    const { runtime, state, deps } = createAdventureRuntime();
    state.session = proposedSession(
      state.session!,
      rollProposal,
      runtime.newTurnMetadata("Cross"),
      "roll",
    );
    vi.spyOn(deps.generation, "generate").mockResolvedValue(rollProposal);
    await new AdventureRolls(runtime).recordRollOutcome({
      kind: "numeric",
      value: 15,
    });
    expect(state.session?.pendingRoll?.suppliedOutcome).toMatchObject({
      value: 15,
    });
    expect(state.errorMessage).toBe("roll-resolution-requires-complete-turn");
    expect(state.session?.turns).toHaveLength(0);
  });
});

describe("AdventureTools", () => {
  it("manages presets and counters through the shared session", async () => {
    const { runtime, state } = createAdventureRuntime();
    const tools = new AdventureTools(runtime);
    await tools.addDicePreset("Search", "1d20");
    await tools.addResourceCounter("Health", 10);
    const counter = state.session!.resourceCounters[0];
    await tools.adjustResourceCounter(counter.id, 8);
    expect(state.session?.resourceCounters[0].value).toBe(8);
    await tools.removeResourceCounter(counter.id);
    await tools.removeDicePreset(state.session!.dicePresets[0].id);
    expect(state.session?.resourceCounters).toEqual([]);
    expect(state.session?.dicePresets).toEqual([]);
  });

  it("rejects tool mutations in a read-only session", async () => {
    const { runtime, state } = createAdventureRuntime();
    state.readOnly = true;
    await expect(
      new AdventureTools(runtime).addResourceCounter("Health", 10),
    ).rejects.toThrow("no-active-session");
    expect(state.session?.resourceCounters).toEqual([]);
  });

  it("returns a stale correction outcome without publishing rejected state", async () => {
    const { runtime, state, deps } = createAdventureRuntime();
    const original = state.session;
    vi.spyOn(deps.repository, "save").mockResolvedValue({
      ok: false,
      error: new Error("revision-conflict"),
    } as any);
    const patch = {
      ...completeProposal.visiblePatch,
      situation: {
        id: "situation",
        text: "Corrected",
        source: "provisional" as const,
      },
    };
    expect(await new AdventureTools(runtime).submitCorrection(patch)).toBe(
      "stale-revision",
    );
    expect(state.session).toBe(original);
  });
});

describe("AdventureRuntime scope checks", () => {
  it("rejects a Vault change during lease verification before saving", async () => {
    const { runtime, state, deps } = createAdventureRuntime();
    const original = state.session!;
    const save = vi.spyOn(deps.repository, "save");
    vi.spyOn(deps.authority, "verify").mockImplementation(async () => {
      state.session = { ...original, vaultId: "another-vault" };
      return true;
    });
    await expect(
      runtime.saveTurn(original, { ...original, revision: 1 }),
    ).rejects.toThrow("stale-adventure-context");
    expect(save).not.toHaveBeenCalled();
  });

  it("rejects a late saved result after the view has closed", async () => {
    const { runtime, state, deps } = createAdventureRuntime();
    const original = state.session!;
    const next = { ...original, revision: 1 };
    vi.spyOn(deps.repository, "save").mockImplementation(async () => {
      state.session = null;
      return { ok: true, session: next } as any;
    });
    await expect(runtime.saveTurn(original, next)).rejects.toThrow(
      "stale-adventure-context",
    );
    expect(state.session).toBeNull();
  });
});

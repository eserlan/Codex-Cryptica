import { describe, expect, it, vi } from "vitest";
import { AdventureState } from "../adventure-state.svelte";
import { resolveAdventureDependencies } from "../adventure-dependencies";
import { acceptedSession, proposedSession } from "../adventure-session";
import {
  completeProposal,
  createAdventureRuntime,
  now,
} from "./adventure-fixtures";

describe("AdventureState", () => {
  it("projects only player-visible data from the shared reactive session", () => {
    const { state, runtime } = createAdventureRuntime();
    const session = state.session!;
    state.session = proposedSession(
      session,
      { ...completeProposal, suggestedActions: ["Explore", "Ask", "Wait"] },
      runtime.newTurnMetadata("Look"),
      "rejected",
    );
    expect(state.transcript?.turns[0].narration).toBe(
      completeProposal.narration,
    );
    expect(state.suggestedActions).toEqual(["Explore", "Ask", "Wait"]);
    expect(state.recap).not.toBeNull();
    expect(state.rollHistory).toEqual([]);
  });

  it("exposes empty projections without an active adventure", () => {
    const state = new AdventureState();
    expect(state.transcript).toBeNull();
    expect(state.recap).toBeNull();
    expect(state.suggestedActions).toEqual([]);
    expect(state.rollHistory).toEqual([]);
  });
});

describe("adventure dependency defaults", () => {
  it("preserves injected services and fills in omitted production utilities", () => {
    const generation = { generate: vi.fn() };
    const deps = resolveAdventureDependencies({ generation });
    expect(deps.generation).toBe(generation);
    expect(deps.idGenerator()).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(deps.now()))).toBe(false);
    expect(deps.dice.evaluate("1d1").total).toBe(1);
  });

  it("does not replace a failing injected utility with a default", () => {
    const deps = resolveAdventureDependencies({
      idGenerator: () => {
        throw new Error("id-failed");
      },
    });
    expect(() => deps.idGenerator()).toThrow("id-failed");
  });
});

describe("AdventureRuntime", () => {
  it("saves against the prior revision after verifying control", async () => {
    const { runtime, state, deps } = createAdventureRuntime();
    const verify = vi.spyOn(deps.authority, "verify");
    const save = vi.spyOn(deps.repository, "save");
    const confirm = vi.spyOn(deps, "confirmGenerationInteraction").mockResolvedValue();
    const original = state.session!;
    const next = { ...original, revision: 1 };
    expect(await runtime.saveTurn(original, next)).toBe(next);
    expect(verify).toHaveBeenCalledWith(state.lease);
    expect(save).toHaveBeenCalledWith(0, next);
    expect(confirm).toHaveBeenCalledWith(original.id);
    expect(state.session).toBe(original);
    expect(runtime.rollMetadata("existing-input")).toMatchObject({
      inputId: "existing-input",
      now,
    });
  });

  it("prevents a save after control is lost and propagates storage failures", async () => {
    const { runtime, state, deps } = createAdventureRuntime();
    const save = vi.spyOn(deps.repository, "save");
    state.lease = null;
    await expect(
      runtime.saveTurn(state.session!, state.session!),
    ).rejects.toThrow("control-lost");
    expect(save).not.toHaveBeenCalled();
    const {
      runtime: owner,
      state: owned,
      deps: ownerDeps,
    } = createAdventureRuntime();
    vi.spyOn(ownerDeps.repository, "save").mockResolvedValue({
      ok: false,
      error: new Error("disk-full"),
    } as any);
    await expect(
      owner.saveTurn(owned.session!, owned.session!),
    ).rejects.toThrow("disk-full");
  });

  it("does not advance remote memory on a failed save, and clears it on rejected generation", async () => {
    const { runtime, state, deps } = createAdventureRuntime();
    const confirm = vi.spyOn(deps, "confirmGenerationInteraction").mockResolvedValue();
    const clear = vi.spyOn(deps, "clearGenerationInteraction").mockResolvedValue();
    vi.spyOn(deps.repository, "save").mockResolvedValue({
      ok: false, error: new Error("storage-failed"),
    } as any);
    await expect(runtime.saveTurn(state.session!, state.session!)).rejects.toThrow(
      "storage-failed",
    );
    expect(confirm).not.toHaveBeenCalled();
    await runtime.runTurnGeneration(async () => {
      throw new Error("turn-rejected");
    }, "ready");
    expect(clear).toHaveBeenCalledWith(state.session!.id);
    expect(state.errorMessage).toBe("turn-rejected");
  });

  it("keeps an already saved turn when remote confirmation fails", async () => {
    const { runtime, state, deps } = createAdventureRuntime();
    vi.spyOn(deps, "confirmGenerationInteraction").mockRejectedValue(
      new Error("worker-disconnected"),
    );
    const clear = vi.spyOn(deps, "clearGenerationInteraction").mockResolvedValue();
    const previous = state.session!;
    const next = { ...previous, revision: 1 };
    await expect(runtime.saveTurn(previous, next)).resolves.toBe(next);
    expect(clear).toHaveBeenCalledWith(previous.id);
  });

  it("ignores stale narration and does not clear a newer generation controller", () => {
    const { runtime, state } = createAdventureRuntime();
    const first = runtime.startTurnGeneration();
    const preview = runtime.narrationPreview(state.session!.id, first);
    preview("First preview");
    expect(state.streamedNarration).toBe("First preview");
    const second = runtime.startTurnGeneration();
    expect(first.aborted).toBe(true);
    preview("Late preview");
    runtime.endTurnGeneration(first);
    expect(state.streamedNarration).toBe("");
    expect(runtime.generationController?.signal).toBe(second);
    runtime.narrationPreview("another-session", second)("Wrong session");
    expect(state.streamedNarration).toBe("");
    runtime.endTurnGeneration(second);
    expect(runtime.generationController).toBeNull();
  });

  it("retains retry phases on cancellation and distinguishes offline actions", () => {
    const { runtime, state } = createAdventureRuntime();
    const signal = runtime.startTurnGeneration();
    runtime.recordTurnGenerationError(new Error("offline"), signal, "ready");
    expect(state.phase).toBe("offline");
    runtime.recordTurnGenerationError(
      new DOMException("Cancelled", "AbortError"),
      signal,
      "ready-to-resolve",
    );
    expect(state.phase).toBe("ready-to-resolve");
    runtime.generationController!.abort();
    state.errorMessage = "new error";
    runtime.recordTurnGenerationError(new Error("old error"), signal, "ready");
    expect(state.errorMessage).toBe("new error");
  });
});

describe("adventure reducer acceptance", () => {
  it("accepts successful reducers and reports their rejection or fallback", () => {
    const { state } = createAdventureRuntime();
    expect(
      acceptedSession({ ok: true, value: state.session! }, "fallback"),
    ).toBe(state.session);
    expect(() =>
      acceptedSession(
        { ok: false, errors: [{ message: "invalid" }] },
        "fallback",
      ),
    ).toThrow("invalid");
    expect(() => acceptedSession({ ok: false }, "fallback")).toThrow(
      "fallback",
    );
  });
});

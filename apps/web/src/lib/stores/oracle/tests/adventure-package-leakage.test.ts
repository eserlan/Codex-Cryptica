import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdventureJsonV1 } from "@codex/adventure-engine";
import { AdventureManager } from "../adventure-manager.svelte";
import { TURN_REJECTED_COPY } from "../adventure-turn-retry";
import {
  completeProposal,
  dependencies,
  packageCacheFor,
  packageRefFor,
  referencePackage,
  rollProposal,
  startInput,
} from "./adventure-fixtures";

function onlineNavigator() {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { onLine: true },
  });
}

function makeFixtureWithGmMetadata(): {
  pkg: AdventureJsonV1;
  visibleLocationId: string;
  hiddenActorId: string;
  secretText: string;
} {
  const pkg = structuredClone(referencePackage);
  const visibleLocation = pkg.locations.find(
    (loc) => loc.visibility === "player-visible",
  )!;
  const hiddenActorId = "actor-vault-agent-9";
  const secretText = "The syndicate bribed the harbourmaster at midnight";
  pkg.actors.push({
    id: hiddenActorId,
    name: "Kaelen Voss",
    summary: "Syndicate fixer watching the docks",
    role: "guard",
    disposition: "hostile",
    locationId: visibleLocation.id,
    visibility: "gm-only",
    epistemicStatus: "explicit",
  });
  pkg.secrets.push({
    id: "secret-harbour-bribe",
    text: secretText,
    visibility: "gm-only",
    epistemicStatus: "explicit",
  });
  return {
    pkg,
    visibleLocationId: visibleLocation.id,
    hiddenActorId,
    secretText,
  };
}

function setupManager(
  pkg: AdventureJsonV1,
  generate: (request: any) => Promise<any>,
) {
  onlineNavigator();
  const deps: any = dependencies();
  deps.packages = packageCacheFor(pkg);
  deps.clearGenerationInteraction = vi.fn(deps.clearGenerationInteraction);
  deps.generation = { generate: vi.fn(generate) };
  const manager = new AdventureManager(deps);
  return {
    manager,
    deps,
    start: () =>
      manager.start({ ...startInput, sourcePackage: packageRefFor(pkg) }),
  };
}

describe("Adventure package leakage guards, diagnostics & opening retry (#5052)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allows player-visible record IDs and ordinary words from gm-only metadata labels in opening, turns, and roll requests", async () => {
    const { pkg, visibleLocationId } = makeFixtureWithGmMetadata();
    const visibleSceneId = pkg.scenes.find(
      (scene) => scene.visibility === "player-visible",
    )!.id;

    let step = 0;
    const ctx = setupManager(pkg, async () => {
      step += 1;
      if (step === 1) {
        return {
          ...completeProposal,
          narration: `You arrive at ${visibleLocationId} (${visibleSceneId}); a hostile guard watches the pier.`,
        };
      }
      if (step === 2) {
        return {
          ...rollProposal,
          setupNarration: `Near ${visibleLocationId}, the hostile guard blocks the gate.`,
        };
      }
      return {
        ...completeProposal,
        narration: `You slip past the guard at ${visibleLocationId}.`,
      };
    });

    await ctx.start();
    expect(ctx.manager.phase).toBe("ready");
    expect(ctx.manager.session?.turns).toHaveLength(1);
    expect(ctx.manager.errorMessage).toBeNull();

    await ctx.manager.submitAction("Slip past the guard");
    expect(ctx.manager.phase).toBe("awaiting-roll");
    expect(ctx.manager.session?.pendingRoll).not.toBeNull();

    await ctx.manager.recordRollOutcome({
      kind: "numeric",
      value: 15,
      parts: [{ type: "dice", sides: 20, rolls: [15], value: 15 }],
    });
    expect(ctx.manager.phase).toBe("ready");
    expect(ctx.manager.session?.turns).toHaveLength(2);
  });

  it("still blocks hidden record IDs and GM-only secrets in turns and roll requests", async () => {
    const { pkg, hiddenActorId, secretText } = makeFixtureWithGmMetadata();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    let phase = "open";
    const ctx = setupManager(pkg, async () => {
      if (phase === "open") return completeProposal;
      if (phase === "leak-id") {
        return {
          ...completeProposal,
          narration: `You spot ${hiddenActorId} in the shadows.`,
        };
      }
      return {
        ...rollProposal,
        setupNarration: `You realise ${secretText}.`,
      };
    });

    await ctx.start();
    expect(ctx.manager.phase).toBe("ready");

    phase = "leak-id";
    await ctx.manager.submitAction("Search the shadows");
    expect(ctx.manager.phase).toBe("error");
    expect(ctx.manager.errorMessage).toBe(TURN_REJECTED_COPY);
    expect(ctx.manager.session?.turns).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith(
      "Adventure turn refused:",
      expect.any(String),
      {
        guard: "package-id",
        field: "root.narration",
        sourceRef: "pinned-package-id",
      },
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain(hiddenActorId);

    warn.mockClear();
    phase = "leak-secret";
    await ctx.manager.submitAction("Inspect the ledger");
    expect(ctx.manager.phase).toBe("error");
    expect(ctx.manager.errorMessage).toBe(TURN_REJECTED_COPY);
    expect(ctx.manager.session?.pendingRoll).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      "Adventure turn refused:",
      expect.any(String),
      {
        guard: "package-text",
        field: "root.setupNarration",
        sourceRef: "pinned-package-text",
      },
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain(secretText);
  });

  it("automatically retries a leaked opening once after clearing provider interaction", async () => {
    const { pkg, secretText } = makeFixtureWithGmMetadata();
    let attempts = 0;
    const ctx = setupManager(pkg, async (request) => {
      attempts += 1;
      if (attempts === 1) {
        return {
          ...completeProposal,
          narration: `Opening spoiler: ${secretText}.`,
        };
      }
      expect(request.correction).toBeTruthy();
      return {
        ...completeProposal,
        narration: "Rain patters against the pier lanterns.",
      };
    });

    await ctx.start();
    expect(attempts).toBe(2);
    expect(ctx.deps.clearGenerationInteraction).toHaveBeenCalledTimes(1);
    expect(ctx.manager.phase).toBe("ready");
    expect(ctx.manager.session?.turns).toHaveLength(1);
    expect(ctx.manager.session?.turns[0]?.narration).toBe(
      "Rain patters against the pier lanterns.",
    );
  });

  it("retains the 0-turn session on repeated opening rejection, logs opaque diagnostics, and succeeds on Retry opening after reload", async () => {
    const { pkg, secretText } = makeFixtureWithGmMetadata();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const archiveSpy = vi.fn();

    let allowClean = false;
    const ctx = setupManager(pkg, async () =>
      allowClean
        ? {
            ...completeProposal,
            narration: "The harbour wakes beneath a cold mist.",
          }
        : {
            ...completeProposal,
            narration: `Leaked opening: ${secretText}.`,
          },
    );
    ctx.deps.repository.archive = archiveSpy;

    await ctx.start();
    const sessionId = ctx.manager.session?.id;
    expect(sessionId).toBeTruthy();
    expect(archiveSpy).not.toHaveBeenCalled();
    expect(ctx.manager.phase).toBe("error");
    expect(ctx.manager.errorCause).toBe("opening-rejected");
    expect(ctx.manager.errorMessage).toBe(TURN_REJECTED_COPY);
    expect(ctx.manager.errorMessage).not.toContain(secretText);
    expect(ctx.manager.session?.turns).toHaveLength(0);
    expect(ctx.deps.clearGenerationInteraction).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith(
      "Adventure turn refused:",
      expect.any(String),
      {
        guard: "package-text",
        field: "root.narration",
        sourceRef: "pinned-package-text",
      },
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain(secretText);

    // Simulate reload: open the saved 0-turn session in a fresh manager instance, then retry opening.
    const reloaded = new AdventureManager(ctx.deps);
    await reloaded.open("vault-1", sessionId!);
    expect(reloaded.session?.id).toBe(sessionId);
    expect(reloaded.session?.turns).toHaveLength(0);

    allowClean = true;
    await reloaded.retryOpening();
    expect(reloaded.phase).toBe("ready");
    expect(reloaded.errorCause).toBeNull();
    expect(reloaded.session?.turns).toHaveLength(1);
    expect(reloaded.session?.turns[0]?.narration).toBe(
      "The harbour wakes beneath a cold mist.",
    );
  });

  it("does not retry opening when cancelled mid-generation", async () => {
    const { pkg } = makeFixtureWithGmMetadata();
    let resolveGenerate!: (value: any) => void;
    const ctx = setupManager(
      pkg,
      () =>
        new Promise((resolve) => {
          resolveGenerate = resolve;
        }),
    );

    const pendingStart = ctx.start();
    await vi.waitFor(() =>
      expect(ctx.deps.generation.generate).toHaveBeenCalledTimes(1),
    );
    ctx.manager.cancel();
    resolveGenerate(completeProposal);
    await pendingStart;

    expect(ctx.deps.generation.generate).toHaveBeenCalledTimes(1);
    expect(ctx.manager.streamedNarration).toBe("");
    expect(ctx.manager.session?.turns).toHaveLength(0);
  });
});

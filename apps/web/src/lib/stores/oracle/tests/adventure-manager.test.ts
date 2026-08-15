import { describe, expect, it } from "vitest";
import { AdventureManager } from "../adventure-manager.svelte";

const now = "2026-08-16T12:00:00.000Z";
const completeProposal = {
  kind: "complete" as const,
  narration: "A lantern flickers at the road's end.",
  visiblePatch: {
    situation: {
      id: "situation",
      text: "A lantern flickers",
      source: "provisional" as const,
    },
    objectives: { add: [], update: [], removeIds: [] },
    activeCharacters: { add: [], update: [], removeIds: [] },
    knownFacts: { add: [], update: [], removeIds: [] },
    relationships: { add: [], update: [], removeIds: [] },
  },
  hiddenPatch: {
    secrets: { add: [], update: [], removeIds: [] },
    gmThreads: { add: [], update: [], removeIds: [] },
  },
  revealSecretIds: [],
  provisionalFacts: [],
  sourceRecordIds: [],
};

function dependencies() {
  let current: any = null;
  return {
    repository: {
      async list() {
        return { effectiveActiveId: null, entries: [] };
      },
      async save(_revision: number | null, session: any) {
        current = session;
        return { ok: true, session };
      },
      async load() {
        return { condition: "normal", session: current };
      },
      async archive() {
        current = { ...current, status: "archived" };
        return { ok: true, session: current };
      },
    },
    generation: {
      async generate() {
        return completeProposal;
      },
    },
    context: {
      async resolveAnchors() {
        return [];
      },
      async resolveActionRelevant() {
        return [];
      },
    },
    authority: {
      async acquire(key: any) {
        return {
          ok: true,
          lease: {
            ...key,
            ownerId: "owner",
            fencingToken: 1,
            expiresAt: Date.now() + 10_000,
          },
        };
      },
      async verify() {
        return true;
      },
      async renew(lease: any) {
        return { ok: true, lease };
      },
      async release() {},
    },
    coordinator: {
      start() {},
      async stop() {},
      subscribe() {
        return () => {};
      },
    },
    now: () => now,
  };
}

describe("AdventureManager", () => {
  it("preserves the opening and commits a grounded action through the repository", async () => {
    const manager = new AdventureManager(dependencies() as any);
    await manager.start({
      vaultId: "vault-1",
      title: "Road",
      premise: "Find the road",
      playerCharacter: {
        kind: "provisional",
        name: "Mara",
        description: "Guide",
      },
    });
    expect(manager.session?.turns).toHaveLength(1);
    await manager.submitAction("Walk toward the lantern");
    expect(manager.session?.turns).toHaveLength(2);
    expect(manager.session?.turns[1]?.playerAction).toBe(
      "Walk toward the lantern",
    );
  });

  it("keeps a typed action local when offline", async () => {
    const manager = new AdventureManager(dependencies() as any);
    await manager.start({
      vaultId: "vault-1",
      title: "Road",
      premise: "Find the road",
      playerCharacter: {
        kind: "provisional",
        name: "Mara",
        description: "Guide",
      },
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { onLine: false },
    });
    await manager.submitAction("Wait for dawn");
    expect(manager.phase).toBe("offline");
    expect(manager.draft).toBe("Wait for dawn");
  });
});

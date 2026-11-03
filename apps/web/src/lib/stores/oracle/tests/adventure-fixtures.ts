export const now = "2026-08-16T12:00:00.000Z";
export const completeProposal = {
  kind: "complete" as const,
  narration: "A lantern flickers at the road's end.",
  visiblePatch: {
    situation: {
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

export const rollProposal = {
  kind: "roll-required" as const,
  setupNarration: "The bridge groans beneath Mara's feet.",
  uncertainty: "Can Mara cross before the span breaks?",
  stakes: "A fall would carry Mara into the flooded ravine.",
  dice: {
    expression: "1d20",
    outcomeBands: [
      { id: "result", label: "The result determines the crossing." },
    ],
  },
  sourceRecordIds: [],
};

export function dependencies() {
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
      async resolveOpeningRelevant() {
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
export const startInput = {
  vaultId: "vault-1",
  title: "Road",
  premise: "Find the road",
  playerCharacter: {
    kind: "provisional" as const,
    name: "Mara",
    description: "Guide",
  },
};

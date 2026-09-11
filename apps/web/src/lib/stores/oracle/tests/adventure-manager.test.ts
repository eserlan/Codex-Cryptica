import { describe, expect, it, vi } from "vitest";
import { AdventureManager } from "../adventure-manager.svelte";

const now = "2026-08-16T12:00:00.000Z";
const completeProposal = {
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

const rollProposal = {
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

  it("supplies ranked vault records with the opening request", async () => {
    const deps: any = dependencies();
    const relevant = [
      {
        recordId: "bridge-1",
        displayName: "Flooded Bridge",
        content: "The bridge is watched.",
        role: "turn-source",
      },
    ];
    deps.context.resolveOpeningRelevant = async () => relevant;
    const generate = vi.fn().mockResolvedValue(completeProposal);
    deps.generation = { generate };
    const manager = new AdventureManager(deps);

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

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({ phase: "opening", relevant }),
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

  it("archives a failed opening so the adventure can be restarted", async () => {
    const deps: any = dependencies();
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { onLine: true },
    });
    let openingAttempts = 0;
    deps.generation = {
      async generate(request: any) {
        if (request.phase !== "opening") return completeProposal;
        openingAttempts += 1;
        if (openingAttempts === 1) throw new Error("provider-unavailable");
        return completeProposal;
      },
    };
    const manager = new AdventureManager(deps);

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

    expect(manager.session).toBeNull();
    expect(manager.phase).toBe("error");
    expect(manager.errorMessage).toBe("provider-unavailable");

    await expect(
      manager.start({
        vaultId: "Road-2",
        title: "Second road",
        premise: "Try again",
        playerCharacter: {
          kind: "provisional",
          name: "Mara",
          description: "Guide",
        },
      }),
    ).resolves.toBeDefined();
    expect(manager.session?.turns).toHaveLength(1);
  });

  it("recovers a stale zero-turn active session before starting", async () => {
    const deps: any = dependencies();
    const stale = {
      id: "stale-session",
      vaultId: "vault-1",
      status: "active",
      turns: [],
      revision: 0,
    } as any;
    let archivedId: string | null = null;
    deps.repository.list = async () => ({
      effectiveActiveId: stale.id,
      entries: [],
    });
    deps.repository.load = async () => ({
      condition: "normal",
      session: stale,
    });
    deps.repository.archive = async (_vaultId: string, sessionId: string) => {
      archivedId = sessionId;
      return { ok: true, session: { ...stale, status: "archived" } };
    };

    const manager = new AdventureManager(deps);
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

    expect(archivedId).toBe("stale-session");
    expect(manager.session?.turns).toHaveLength(1);
  });

  it("resolves a recorded outcome immediately without a confirmation step", async () => {
    const deps: any = dependencies();
    const generate = vi.fn(async (request: any) => {
      if (request.phase === "opening") return completeProposal;
      if (request.phase === "action") return rollProposal;
      return completeProposal;
    });
    deps.generation = { generate };
    const manager = new AdventureManager(deps);
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

    await manager.submitAction("Cross the bridge");
    await manager.recordRollOutcome({ kind: "numeric", value: 16 });

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({ phase: "roll-resolution" }),
      expect.anything(),
    );
    expect(manager.session?.pendingRoll).toBeNull();
    expect(manager.session?.turns).toHaveLength(2);
    expect(manager.phase).toBe("ready");
  });

  it("keeps a recorded outcome available for retry when resolution fails", async () => {
    const deps: any = dependencies();
    deps.generation = {
      async generate(request: any) {
        if (request.phase === "opening") return completeProposal;
        if (request.phase === "action") return rollProposal;
        throw new Error("provider-unavailable");
      },
    };
    const manager = new AdventureManager(deps);
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

    await manager.submitAction("Cross the bridge");
    await manager.recordRollOutcome({ kind: "numeric", value: 3 });

    expect(manager.session?.pendingRoll?.suppliedOutcome?.value).toBe(3);
    expect(manager.phase).toBe("error");
    expect(manager.errorMessage).toBe("provider-unavailable");
  });

  it("restores an unresolved roll with its input controls available", async () => {
    const deps: any = dependencies();
    deps.generation = {
      async generate(request: any) {
        if (request.phase === "opening") return completeProposal;
        if (request.phase === "action") return rollProposal;
        return completeProposal;
      },
    };
    const startingManager = new AdventureManager(deps);
    await startingManager.start({
      vaultId: "vault-1",
      title: "Road",
      premise: "Find the road",
      playerCharacter: {
        kind: "provisional",
        name: "Mara",
        description: "Guide",
      },
    });
    await startingManager.submitAction("Cross the bridge");

    const resumedManager = new AdventureManager(deps);
    await resumedManager.open("vault-1", startingManager.session!.id);

    expect(resumedManager.phase).toBe("awaiting-roll");
    expect(
      resumedManager.session?.pendingRoll?.suppliedOutcome,
    ).toBeUndefined();
  });

  it("opens the effective active adventure before a new one is started", async () => {
    const deps: any = dependencies();
    const activeSession = {
      id: "active-adventure",
      vaultId: "vault-1",
      status: "active",
      pendingRoll: null,
    };
    deps.repository.list = async () => ({
      effectiveActiveId: activeSession.id,
      entries: [],
    });
    deps.repository.load = async () => ({
      condition: "normal",
      session: activeSession,
    });
    const manager = new AdventureManager(deps);

    await expect(manager.openActive("vault-1")).resolves.toBe(true);

    expect(manager.session?.id).toBe(activeSession.id);
  });

  it("allows a new adventure when no active one exists", async () => {
    const deps: any = dependencies();
    deps.repository.list = async () => ({
      effectiveActiveId: null,
      entries: [],
    });
    const manager = new AdventureManager(deps);

    await expect(manager.openActive("vault-1")).resolves.toBe(false);
    expect(manager.session).toBeNull();
  });

  it("clears another vault's session before checking for an active adventure", async () => {
    const deps: any = dependencies();
    const stop = vi.fn(async () => undefined);
    deps.coordinator.stop = stop;
    deps.repository.list = async () => ({
      effectiveActiveId: null,
      entries: [],
    });
    const manager = new AdventureManager(deps);
    manager.session = { vaultId: "vault-1", status: "active" } as any;
    manager.draft = "Old action";

    await expect(manager.openActive("vault-2")).resolves.toBe(false);

    expect(stop).toHaveBeenCalledOnce();
    expect(manager.session).toBeNull();
    expect(manager.draft).toBe("");
  });

  it("keeps the newest vault restore when an earlier lookup resolves late", async () => {
    const deps: any = dependencies();
    let resolveFirst!: (value: {
      effectiveActiveId: string | null;
      entries: never[];
    }) => void;
    const firstListing = new Promise<{
      effectiveActiveId: string | null;
      entries: never[];
    }>((resolve) => {
      resolveFirst = resolve;
    });
    deps.repository.list = vi.fn((vaultId: string) =>
      vaultId === "vault-1"
        ? firstListing
        : Promise.resolve({ effectiveActiveId: "active-2", entries: [] }),
    );
    deps.repository.load = vi.fn(
      async (vaultId: string, sessionId: string) => ({
        condition: "normal",
        session: {
          id: sessionId,
          vaultId,
          status: "active",
          pendingRoll: null,
        },
      }),
    );
    const manager = new AdventureManager(deps);

    const firstRestore = manager.openActive("vault-1");
    const secondRestore = manager.openActive("vault-2");

    await expect(secondRestore).resolves.toBe(true);
    resolveFirst({ effectiveActiveId: "active-1", entries: [] });
    await expect(firstRestore).resolves.toBe(false);

    expect(manager.session?.id).toBe("active-2");
    expect(manager.session?.vaultId).toBe("vault-2");
    expect(deps.repository.load).not.toHaveBeenCalledWith(
      "vault-1",
      "active-1",
    );
  });

  it("automatically resolves a recorded roll when the adventure is resumed", async () => {
    const deps: any = dependencies();
    const generate = vi.fn(async (request: any) => {
      if (request.phase === "opening") return completeProposal;
      if (request.phase === "action") return rollProposal;
      return completeProposal;
    });
    deps.generation = { generate };
    const startingManager = new AdventureManager(deps);
    await startingManager.start({
      vaultId: "vault-1",
      title: "Road",
      premise: "Find the road",
      playerCharacter: {
        kind: "provisional",
        name: "Mara",
        description: "Guide",
      },
    });
    await startingManager.submitAction("Cross the bridge");
    const pendingSession = startingManager.session!;
    deps.repository.load = async () => ({
      condition: "normal",
      session: {
        ...pendingSession,
        pendingRoll: {
          ...pendingSession.pendingRoll!,
          suppliedOutcome: { kind: "numeric", value: 16 },
        },
      },
    });

    const resumedManager = new AdventureManager(deps);
    await resumedManager.open("vault-1", pendingSession.id);

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({ phase: "roll-resolution" }),
      expect.anything(),
    );
    expect(resumedManager.session?.pendingRoll).toBeNull();
    expect(resumedManager.phase).toBe("ready");
  });

  it("ignores a late cancelled response when a newer action is active", async () => {
    let actionCalls = 0;
    let resolveFirst!: (proposal: typeof completeProposal) => void;
    let resolveStarted!: () => void;
    const generationStarted = new Promise<void>((resolve) => {
      resolveStarted = resolve;
    });
    const firstResponse = new Promise<typeof completeProposal>((resolve) => {
      resolveFirst = resolve;
    });
    let firstSignal: AbortSignal | undefined;
    const deps: any = dependencies();
    const clearGenerationInteraction = vi.fn(async () => undefined);
    deps.clearGenerationInteraction = clearGenerationInteraction;
    deps.generation = {
      async generate(request: any, options?: { signal?: AbortSignal }) {
        if (request.phase === "opening") return completeProposal;
        actionCalls += 1;
        if (actionCalls === 1) {
          firstSignal = options?.signal;
          resolveStarted();
          return firstResponse;
        }
        return {
          ...completeProposal,
          narration: "The second action wins.",
        };
      },
    };
    const manager = new AdventureManager(deps as any);
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
      value: { onLine: true },
    });
    const first = manager.submitAction("first action");
    await generationStarted;
    manager.cancel();
    const second = manager.submitAction("second action");
    await second;
    resolveFirst(completeProposal);
    await first;

    expect(firstSignal?.aborted).toBe(true);
    expect(clearGenerationInteraction).toHaveBeenCalledWith(
      manager.session?.id,
    );
    expect(manager.session?.turns.at(-1)?.playerAction).toBe("second action");
    expect(manager.errorMessage).toBeNull();
  });
});

async function startedManager() {
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
  return manager;
}

describe("AdventureManager Phase 2 tools", () => {
  it("recap and roll history are empty view models with no session", () => {
    const manager = new AdventureManager(dependencies() as any);
    expect(manager.recap).toBeNull();
    expect(manager.rollHistory).toEqual([]);
  });

  it("recap reflects committed visible state and narration only", async () => {
    const manager = await startedManager();
    expect(manager.recap?.situation?.text).toBe("A lantern flickers");
    expect(manager.recap?.recentTurnSummaries).toContain(
      "A lantern flickers at the road's end.",
    );
  });

  it("applies a visible-state correction and persists it", async () => {
    const manager = await startedManager();
    const revisionBefore = manager.session!.revision;
    const outcome = await manager.submitCorrection({
      location: {
        id: "loc-1",
        text: "The east crossing",
        source: "provisional",
      },
      objectives: { add: [], update: [], removeIds: [] },
      activeCharacters: { add: [], update: [], removeIds: [] },
      knownFacts: { add: [], update: [], removeIds: [] },
      relationships: { add: [], update: [], removeIds: [] },
    });
    expect(outcome).toBe("applied");
    expect(manager.session?.visibleState.location?.text).toBe(
      "The east crossing",
    );
    expect(manager.session!.revision).toBe(revisionBefore + 1);
  });

  it("adds, uses, and removes a dice preset", async () => {
    const manager = await startedManager();
    await manager.addDicePreset("Advantage", "2d20kh1");
    expect(manager.session?.dicePresets).toHaveLength(1);
    const presetId = manager.session!.dicePresets[0]!.id;
    await manager.removeDicePreset(presetId);
    expect(manager.session?.dicePresets).toHaveLength(0);
  });

  it("adds, adjusts, and removes a resource counter", async () => {
    const manager = await startedManager();
    await manager.addResourceCounter("Ammo", 6);
    const counterId = manager.session!.resourceCounters[0]!.id;
    expect(manager.session?.resourceCounters[0]?.value).toBe(6);

    await manager.adjustResourceCounter(counterId, 3);
    expect(manager.session?.resourceCounters[0]?.value).toBe(3);

    await manager.removeResourceCounter(counterId);
    expect(manager.session?.resourceCounters).toHaveLength(0);
  });

  it("rejects a non-finite resource counter value", async () => {
    const manager = await startedManager();
    await expect(
      manager.addResourceCounter("Ammo", Number.NaN),
    ).rejects.toThrow();
  });

  it("resumes an archived adventure as active when none is currently active", async () => {
    const deps: any = dependencies();
    let current: any = {
      id: "archived-1",
      vaultId: "vault-1",
      status: "archived",
      revision: 2,
      turns: [],
      pendingRoll: null,
    };
    deps.repository.list = async () => ({
      effectiveActiveId: null,
      entries: [],
    });
    deps.repository.load = async () => ({
      condition: "normal",
      session: current,
    });
    deps.repository.save = async (_rev: number, session: any) => {
      current = session;
      return { ok: true, session };
    };
    const manager = new AdventureManager(deps);

    const resumed = await manager.resumeArchived("vault-1", "archived-1");
    expect(resumed.status).toBe("active");
    expect(manager.session?.status).toBe("active");
  });

  it("refuses to resume when an adventure is already active", async () => {
    const deps: any = dependencies();
    deps.repository.list = async () => ({
      effectiveActiveId: "already-active",
      entries: [],
    });
    const manager = new AdventureManager(deps);

    await expect(
      manager.resumeArchived("vault-1", "archived-1"),
    ).rejects.toThrow("active-adventure-exists");
  });

  it("forceEnd archives a stuck read-only session and clears it back to idle", async () => {
    const deps: any = dependencies();
    const clearGenerationInteraction = vi.fn(async () => undefined);
    deps.clearGenerationInteraction = clearGenerationInteraction;
    const coordinatorStop = vi.fn(async () => undefined);
    deps.coordinator.stop = coordinatorStop;
    const manager = new AdventureManager(deps as any);
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
    // Simulate what open() produces when this tab couldn't acquire the
    // lease for an otherwise-orphaned active session.
    manager.readOnly = true;
    manager.lease = null;

    await manager.forceEnd();

    expect(manager.session).toBeNull();
    expect(manager.readOnly).toBe(false);
    expect(manager.phase).toBe("idle");
    expect(coordinatorStop).toHaveBeenCalled();
    expect(clearGenerationInteraction).toHaveBeenCalled();
  });

  it("forceEnd surfaces a revision conflict instead of cutting off a genuinely active tab", async () => {
    const deps: any = dependencies();
    deps.repository.archive = async () => ({
      ok: false,
      error: new Error("revision-conflict"),
    });
    const manager = new AdventureManager(deps as any);
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
    manager.readOnly = true;

    await expect(manager.forceEnd()).rejects.toThrow("revision-conflict");
    expect(manager.session).not.toBeNull();
  });
});

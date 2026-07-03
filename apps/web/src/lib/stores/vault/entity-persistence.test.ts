import { describe, it, expect, vi, beforeEach } from "vitest";

vi.hoisted(() => {
  (global as any).$state = (v: any) => v;
  (global as any).$state.raw = (v: any) => v;
  (global as any).$state.snapshot = (v: any) => v;
});

vi.mock("../debug.svelte", () => ({
  debugStore: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("$lib/stores/ui/session-mode.svelte", () => ({
  sessionModeStore: { isDemoMode: false, isGuestMode: false },
}));
const cacheSet = vi.fn(async () => {});
vi.mock("../../services/cache.svelte", () => ({
  cacheService: { set: (...a: any[]) => (cacheSet as any)(...a) },
}));
vi.mock("./registry", () => ({ updateLastInternalChange: vi.fn() }));

import { EntityPersistenceService } from "./entity-persistence";

function makeService(saveToDisk: any, entities: Record<string, any>) {
  const repository: any = {
    entities,
    saveToDisk,
    enqueueSave: (_id: string, task: () => Promise<any>) => task(),
    waitForAllSaves: async () => {},
  };
  const svc = new EntityPersistenceService({
    repository,
    activeVaultId: () => "v1",
    isGuest: () => false,
    getSpecificVaultHandle: async () => ({}) as any,
    setStatus: () => {},
    status: () => "idle",
    setErrorMessage: () => {},
    onEntityUpdate: undefined,
    isContentLoaded: () => true,
    loadContent: async () => {},
    markContentLoaded: () => {},
  } as any);
  return { svc, repository };
}

describe("EntityPersistenceService disk-write resilience", () => {
  beforeEach(() => {
    cacheSet.mockClear();
  });

  it("retries a transiently failing disk write and still persists", async () => {
    let attempts = 0;
    const saveToDisk = vi.fn(async () => {
      attempts++;
      if (attempts < 2) throw new Error("transient OPFS error");
    });
    const entities = {
      hero: {
        id: "hero",
        title: "Hero",
        connections: [{ target: "x", type: "knows", strength: 1 }],
      },
    };
    const { svc } = makeService(saveToDisk, entities);

    await svc.scheduleSave(entities.hero as any);
    await svc.flushPendingSaves();

    // First attempt threw, retry succeeded — and the cache write only happens
    // after a successful disk write (no silent divergence).
    expect(saveToDisk).toHaveBeenCalledTimes(2);
    expect(cacheSet).toHaveBeenCalledTimes(1);
  });

  it("does not write the cache when the disk write ultimately fails", async () => {
    const saveToDisk = vi.fn(async () => {
      throw new Error("permanent OPFS error");
    });
    const entities = { hero: { id: "hero", title: "Hero", connections: [] } };
    const { svc } = makeService(saveToDisk, entities);

    await svc.scheduleSave(entities.hero as any);
    await svc.flushPendingSaves();

    // 3 attempts within the single _persistEntity call, all failed.
    expect(saveToDisk).toHaveBeenCalledTimes(3);
    // Crucially: the cache is NOT told the entity saved, so it can't mask the
    // on-disk loss the way it did before.
    expect(cacheSet).not.toHaveBeenCalled();
  });
});

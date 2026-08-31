import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
const cacheGetEntityContent = vi.fn<
  (
    vaultId: string,
    entityId: string,
  ) => Promise<{
    content: string;
    lore: string;
  } | null>
>(async () => null);
vi.mock("../../services/cache.svelte", () => ({
  cacheService: {
    set: (...a: any[]) => (cacheSet as any)(...a),
    getEntityContent: (...a: any[]) => (cacheGetEntityContent as any)(...a),
  },
}));
vi.mock("./registry", () => ({ updateLastInternalChange: vi.fn() }));

import { EntityPersistenceService } from "./entity-persistence";
import { systemClock } from "../../utils/runtime-deps";

function makeService(
  saveToDisk: any,
  entities: Record<string, any>,
  options: {
    activeVaultId?: () => string | null;
    isContentLoaded?: (id: string) => boolean;
    loadContent?: (id: string) => Promise<void>;
    markContentLoaded?: (id: string) => void;
    setStatus?: (s: any) => void;
    setErrorMessage?: (msg: string | null) => void;
    onPermanentFailure?: (id: string) => void;
  } = {},
) {
  const repository: any = {
    entities,
    saveToDisk,
    enqueueSave: (_id: string, task: () => Promise<any>) => task(),
    waitForAllSaves: async () => {},
  };
  const svc = new EntityPersistenceService({
    repository,
    activeVaultId: options.activeVaultId ?? (() => "v1"),
    isGuest: () => false,
    getSpecificVaultHandle: async () => ({}) as any,
    setStatus: options.setStatus ?? (() => {}),
    status: () => "idle",
    setErrorMessage: options.setErrorMessage ?? (() => {}),
    onEntityUpdate: undefined,
    onPermanentFailure: options.onPermanentFailure,
    isContentLoaded: options.isContentLoaded ?? (() => true),
    loadContent: options.loadContent ?? (async () => {}),
    markContentLoaded: options.markContentLoaded ?? (() => {}),
  } as any);
  return { svc, repository };
}

describe("EntityPersistenceService disk-write resilience", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    cacheSet.mockClear();
    cacheGetEntityContent.mockClear();
    cacheGetEntityContent.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
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

    const scheduledSave = svc.scheduleSave(entities.hero as any);
    const flush = svc.flushPendingSaves();
    await vi.advanceTimersByTimeAsync(50);
    await Promise.all([scheduledSave, flush]);

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

    const scheduledSave = svc.scheduleSave(entities.hero as any);
    const flush = svc.flushPendingSaves();
    await vi.advanceTimersByTimeAsync(150);
    await Promise.all([scheduledSave, flush]);

    // 3 attempts within the single _persistEntity call, all failed.
    expect(saveToDisk).toHaveBeenCalledTimes(3);
    // Crucially: the cache is NOT told the entity saved, so it can't mask the
    // on-disk loss the way it did before.
    expect(cacheSet).not.toHaveBeenCalled();
  });
});

describe("EntityPersistenceService immediate batches", () => {
  beforeEach(() => {
    cacheSet.mockClear();
  });

  it("returns per-entity outcomes without waiting for the debounce", async () => {
    const saveToDisk = vi.fn(
      async (_handle: unknown, _vaultId: string, entity: any) => {
        if (entity.id === "broken") throw new Error("disk full");
      },
    );
    const entities = {
      hero: { id: "hero", title: "Hero", connections: [] },
      broken: { id: "broken", title: "Broken", connections: [] },
    };
    const { svc } = makeService(saveToDisk, entities);

    const results = await svc.persistImmediately([
      { entity: entities.hero as any },
      { entity: entities.broken as any },
    ]);

    expect(results).toEqual([
      { id: "hero", ok: true },
      { id: "broken", ok: false },
    ]);
    expect(saveToDisk).toHaveBeenCalledTimes(4);
    expect(cacheSet).toHaveBeenCalledTimes(1);
  });

  it("cancels stale entries when the active vault changes mid-batch", async () => {
    let activeVaultId: string | null = "v1";
    const saveToDisk = vi.fn(
      async (_handle: unknown, _vaultId: string, entity: any) => {
        if (entity.id === "hero") activeVaultId = "v2";
      },
    );
    const entities = {
      hero: { id: "hero", title: "Hero", connections: [] },
      place: { id: "place", title: "Place", connections: [] },
    };
    const { svc } = makeService(saveToDisk, entities, {
      activeVaultId: () => activeVaultId,
    });

    const results = await svc.persistImmediately(
      [{ entity: entities.hero as any }, { entity: entities.place as any }],
      1,
    );

    expect(results).toEqual([
      { id: "hero", ok: true },
      { id: "place", ok: false },
    ]);
    expect(saveToDisk).toHaveBeenCalledTimes(1);
  });
});

describe("EntityPersistenceService coordinate-only saves", () => {
  beforeEach(() => {
    cacheSet.mockClear();
    cacheGetEntityContent.mockClear();
    cacheGetEntityContent.mockResolvedValue(null);
  });

  it("restores cached content without hydrating the reactive store", async () => {
    const saveToDisk = vi.fn(async () => {});
    const loadContent = vi.fn(async () => {
      throw new Error("content loader should not run");
    });
    const markContentLoaded = vi.fn();
    const nowSpy = vi.spyOn(systemClock, "now").mockReturnValue(1234567);
    cacheGetEntityContent.mockResolvedValue({
      content: "Existing chronicle",
      lore: "Existing lore",
    });
    const entities = {
      hero: {
        id: "hero",
        title: "Hero",
        connections: [],
        metadata: { coordinates: { x: 10, y: 20 } },
        _path: ["hero.md"],
      },
    };
    const { svc } = makeService(saveToDisk, entities, {
      isContentLoaded: () => false,
      loadContent,
      markContentLoaded,
    });

    await svc.scheduleSave(entities.hero as any, {
      preserveCachedContent: true,
    });
    await svc.flushPendingSaves();

    expect(cacheGetEntityContent).toHaveBeenCalledWith("v1", "hero");
    expect(loadContent).not.toHaveBeenCalled();
    expect(markContentLoaded).not.toHaveBeenCalled();
    expect(saveToDisk).toHaveBeenCalledWith(
      expect.anything(),
      "v1",
      expect.objectContaining({
        content: "Existing chronicle",
        lore: "Existing lore",
      }),
      false,
    );
    expect(cacheSet).toHaveBeenCalledWith(
      "v1:hero.md",
      1234567,
      expect.objectContaining({
        content: "Existing chronicle",
        lore: "Existing lore",
      }),
    );
    nowSpy.mockRestore();
  });

  it("preserves cached content when coordinate-only saves are flushed before debounce", async () => {
    const saveToDisk = vi.fn(async () => {});
    const loadContent = vi.fn(async () => {
      throw new Error("content loader should not run");
    });
    cacheGetEntityContent.mockResolvedValue({
      content: "Cached chronicle",
      lore: "Cached lore",
    });
    const entities = {
      hero: {
        id: "hero",
        title: "Hero",
        connections: [],
        metadata: { coordinates: { x: 10, y: 20 } },
        _path: ["hero.md"],
      },
    };
    const { svc } = makeService(saveToDisk, entities, {
      isContentLoaded: () => false,
      loadContent,
    });

    const pendingSave = svc.scheduleSave(entities.hero as any, {
      preserveCachedContent: true,
    });
    await svc.flushPendingSaves();
    await pendingSave;

    expect(cacheGetEntityContent).toHaveBeenCalledWith("v1", "hero");
    expect(loadContent).not.toHaveBeenCalled();
    expect(saveToDisk).toHaveBeenCalledWith(
      expect.anything(),
      "v1",
      expect.objectContaining({
        content: "Cached chronicle",
        lore: "Cached lore",
      }),
      false,
    );
  });

  it("marks content loaded when preserveCachedContent falls back to hydration", async () => {
    const saveToDisk = vi.fn(async () => {});
    const loadContent = vi.fn(async () => {
      entities.hero.content = "Loaded chronicle";
      entities.hero.lore = "Loaded lore";
    });
    const markContentLoaded = vi.fn();
    cacheGetEntityContent.mockResolvedValue(null);
    const entities = {
      hero: {
        id: "hero",
        title: "Hero",
        connections: [],
        metadata: { coordinates: { x: 10, y: 20 } },
        _path: ["hero.md"],
      } as any,
    };
    const { svc } = makeService(saveToDisk, entities, {
      isContentLoaded: () => false,
      loadContent,
      markContentLoaded,
    });

    await svc.scheduleSave(entities.hero as any, {
      preserveCachedContent: true,
    });
    await svc.flushPendingSaves();

    expect(loadContent).toHaveBeenCalledWith("hero");
    expect(markContentLoaded).toHaveBeenCalledWith("hero");
    expect(saveToDisk).toHaveBeenCalledWith(
      expect.anything(),
      "v1",
      expect.objectContaining({
        content: "Loaded chronicle",
        lore: "Loaded lore",
      }),
      false,
    );
  });
});

describe("EntityPersistenceService save status and immediate mode", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    cacheSet.mockClear();
    cacheGetEntityContent.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("bypasses debounce and persists immediately when immediate: true is passed", async () => {
    const saveToDisk = vi.fn(async () => {});
    const entities = {
      hero: {
        id: "hero",
        title: "Hero",
        content: "Lore content",
        connections: [],
      },
    };
    const setStatus = vi.fn();
    const { svc } = makeService(saveToDisk, entities, { setStatus });

    const savePromise = svc.scheduleSave(entities.hero as any, {
      immediate: true,
    });

    expect(setStatus).toHaveBeenCalledWith("saving");
    await vi.advanceTimersByTimeAsync(1);
    await savePromise;

    expect(saveToDisk).toHaveBeenCalledTimes(1);
    expect(setStatus).toHaveBeenCalledWith("saved");
  });

  it("transitions status from saving to saved upon successful save", async () => {
    const saveToDisk = vi.fn(async () => {});
    const entities = {
      hero: { id: "hero", title: "Hero", connections: [] },
    };
    const setStatus = vi.fn();
    const { svc } = makeService(saveToDisk, entities, { setStatus });

    const savePromise = svc.scheduleSave(entities.hero as any);
    expect(setStatus).toHaveBeenCalledWith("saving");

    await vi.advanceTimersByTimeAsync(450);
    await savePromise;

    expect(saveToDisk).toHaveBeenCalledTimes(1);
    expect(setStatus).toHaveBeenCalledWith("saved");
  });

  it("calls onPermanentFailure and sets error status when maximum requeues are exhausted", async () => {
    const saveToDisk = vi.fn(async () => {
      throw new Error("disk full");
    });
    const entities = {
      hero: { id: "hero", title: "Hero", connections: [] },
    };
    const setStatus = vi.fn();
    const setErrorMessage = vi.fn();
    const onPermanentFailure = vi.fn();
    const { svc } = makeService(saveToDisk, entities, {
      setStatus,
      setErrorMessage,
      onPermanentFailure,
    });

    const savePromise = svc.scheduleSave(entities.hero as any, {
      immediate: true,
    });

    // Advance enough time for initial save and all 3 requeues (250ms + 500ms + 750ms + buffers)
    await vi.advanceTimersByTimeAsync(5000);
    await savePromise;

    expect(setStatus).toHaveBeenCalledWith("error");
    expect(setErrorMessage).toHaveBeenCalledWith(
      "Failed to save entity to storage after multiple attempts.",
    );
    expect(onPermanentFailure).toHaveBeenCalledWith("hero");
  });
});

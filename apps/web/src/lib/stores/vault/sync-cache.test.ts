import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LocalEntity } from "./types";
import { cacheService } from "../../services/cache.svelte";
import { vaultEventBus } from "./events.svelte";
import { VaultSyncCache } from "./sync-cache";
import { createSyncFixture } from "./tests/sync-fixtures";

vi.mock("../../services/cache.svelte", () => ({
  cacheService: { preloadVault: vi.fn(), clearVault: vi.fn() },
}));
beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function snapshot(...entities: LocalEntity[]) {
  return new Map(
    entities.map((entity) => [entity.id, { lastModified: 1, entity }]),
  );
}
const entity = (id: string, updatedAt: number) =>
  ({ id, updatedAt, title: id }) as LocalEntity;
function fixture() {
  const f = createSyncFixture();
  const reload = vi.fn().mockResolvedValue(undefined);
  return { ...f, reload, cache: new VaultSyncCache(f.context, reload) };
}

describe("VaultSyncCache", () => {
  it("preserves newer live writes and entities created during a same-vault preload", () => {
    const { cache, repository } = fixture();
    const initial = snapshot(entity("a", 1));
    cache.seed("vault-1", initial, cache.prepare("vault-1"));
    const sameVault = cache.prepare("vault-1");
    const live = entity("a", 3);
    const added = entity("b", 1);
    repository.entities.a = live;
    repository.entities.b = added;
    const previousMap = repository.entities;
    const emit = vi.spyOn(vaultEventBus, "emit");
    cache.seed("vault-1", initial, sameVault);
    expect(repository.entities).toBe(previousMap);
    expect(repository.entities.a).toBe(live);
    expect(repository.entities.b).toBe(added);
    expect(emit).not.toHaveBeenCalled();
  });

  it("replaces stale cache records and clears the previous vault on a switch", () => {
    const { cache, repository } = fixture();
    const older = entity("a", 1);
    cache.seed("vault-1", snapshot(older), cache.prepare("vault-1"));
    const newer = entity("a", 2);
    cache.seed("vault-1", snapshot(newer), cache.prepare("vault-1"));
    expect(repository.entities.a).toEqual(newer);
    expect(repository.entities.a).not.toBe(newer);
    expect(cache.prepare("vault-2")).toBe(false);
    expect(repository.entities).toEqual({});
  });

  it("bypasses persistent cache for demos and only reuses an explicitly requested snapshot", async () => {
    const { cache } = fixture();
    vi.mocked(cacheService.preloadVault).mockResolvedValue(new Map());
    expect((await cache.preload("demo-1", true, {})).size).toBe(0);
    expect(cacheService.preloadVault).not.toHaveBeenCalled();
    await cache.preload("vault-1", false, {});
    await cache.preload("vault-1", false, { reuseCache: true });
    expect(vi.mocked(cacheService.preloadVault).mock.calls).toEqual([
      ["vault-1"],
      ["vault-1", { reuse: true }],
    ]);
  });

  it("reconciles once after 1500ms and cancels a superseded or stale reconcile", async () => {
    vi.useFakeTimers();
    const { cache, reload, switchVault } = fixture();
    cache.scheduleReconcile("vault-1");
    cache.scheduleReconcile("vault-1");
    await vi.advanceTimersByTimeAsync(1499);
    expect(reload).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(reload).toHaveBeenCalledExactlyOnceWith(false, { reuseCache: true });
    reload.mockClear();
    cache.scheduleReconcile("vault-1");
    cache.cancelReconcile();
    await vi.advanceTimersByTimeAsync(1500);
    expect(reload).not.toHaveBeenCalled();
    cache.scheduleReconcile("vault-1");
    switchVault("vault-2");
    await vi.advanceTimersByTimeAsync(1500);
    expect(reload).not.toHaveBeenCalled();
  });

  it("cancels a pending reconcile when disposed", async () => {
    vi.useFakeTimers();
    const { cache, reload } = fixture();
    cache.scheduleReconcile("vault-1");
    cache.dispose();
    await vi.advanceTimersByTimeAsync(1500);
    expect(reload).not.toHaveBeenCalled();
  });

  it("flushes saves before invalidating and reloading, and stops on a failed flush", async () => {
    const { cache, deps, reload } = fixture();
    await cache.reloadFromDisk();
    expect(deps.flushPendingSaves.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(cacheService.clearVault).mock.invocationCallOrder[0],
    );
    expect(
      vi.mocked(cacheService.clearVault).mock.invocationCallOrder[0],
    ).toBeLessThan(reload.mock.invocationCallOrder[0]);
    expect(reload).toHaveBeenCalledWith(false);
    vi.mocked(cacheService.clearVault).mockClear();
    deps.flushPendingSaves.mockRejectedValueOnce(
      new Error("pending save failed"),
    );
    await expect(cache.reloadFromDisk()).rejects.toThrow("pending save failed");
    expect(cacheService.clearVault).not.toHaveBeenCalled();
  });
});

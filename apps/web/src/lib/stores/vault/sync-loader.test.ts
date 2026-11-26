import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cacheService } from "../../services/cache.svelte";
import type { LocalEntity } from "./types";
import { vaultEventBus } from "./events.svelte";
import { VaultSyncCache } from "./sync-cache";
import { VaultSyncAuxiliary } from "./sync-auxiliary";
import { VaultFolderSync } from "./sync-folder";
import { VaultFileLoader } from "./sync-loader";
import { VaultSyncError } from "./sync-types";
import { createSyncFixture } from "./tests/sync-fixtures";

vi.mock("../../services/cache.svelte", () => ({
  cacheService: { preloadVault: vi.fn(), clearVault: vi.fn() },
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.mocked(cacheService.preloadVault).mockResolvedValue(new Map());
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function fixture() {
  const f = createSyncFixture();
  const reload = vi.fn().mockResolvedValue(undefined);
  const conflicts = vi.fn().mockResolvedValue(undefined);
  const cache = new VaultSyncCache(f.context, reload);
  const folder = new VaultFolderSync(f.context, f.state, reload, conflicts);
  const auxiliary = new VaultSyncAuxiliary(f.context, conflicts);
  const loader = new VaultFileLoader(
    f.context,
    f.state,
    cache,
    folder,
    auxiliary,
    conflicts,
  );
  return { ...f, loader };
}

describe("VaultFileLoader", () => {
  it("paints warm entities before reporting readiness and leaves disk parsing for reconciliation", async () => {
    const { loader, repository, state } = fixture();
    const hero = { id: "hero", title: "Hero", updatedAt: 1 } as LocalEntity;
    vi.mocked(cacheService.preloadVault).mockResolvedValue(
      new Map([["hero", { entity: hero, lastModified: 1 }]]),
    );
    const ready = vi.fn();
    const emit = vi.spyOn(vaultEventBus, "emit");
    await loader.loadFiles(true, { onCacheReady: ready });
    expect(ready).toHaveBeenCalledWith({ cacheState: "warm", count: 1 });
    expect(repository.entities.hero).toEqual(hero);
    expect(repository.loadFiles).not.toHaveBeenCalled();
    expect(emit.mock.calls.map(([event]) => event.type)).toEqual([
      "VAULT_OPENING",
      "CACHE_LOADED",
    ]);
    expect(state.status).toBe("idle");
    expect(state.loadPhase).toBeNull();
  });

  it("reports parse progress and emits only changed records before completing", async () => {
    const { loader, repository, state, deps } = fixture();
    const changed = { id: "a" } as LocalEntity;
    const unchanged = { id: "b" } as LocalEntity;
    const emit = vi.spyOn(vaultEventBus, "emit");
    repository.loadFiles.mockImplementationOnce(async (_id, _dir, progress) => {
      repository.entities = { a: changed, b: unchanged };
      expect(state.loadPhase).toBe("parsing");
      await progress?.(repository.entities, 2, 2, { a: changed });
      await progress?.(repository.entities, 2, 2, {});
      return repository.entities;
    });
    await loader.loadFiles(false);
    expect(state.syncStats).toMatchObject({
      created: 2,
      total: 2,
      progress: 100,
    });
    expect(
      emit.mock.calls.filter(([event]) => event.type === "SYNC_CHUNK_READY"),
    ).toEqual([
      [
        {
          type: "SYNC_CHUNK_READY",
          vaultId: "vault-1",
          entities: { a: changed },
          newOrChangedIds: ["a"],
        },
      ],
    ]);
    expect(deps.updateEntityCount).toHaveBeenCalledWith("vault-1", 2);
    expect(emit).toHaveBeenLastCalledWith({
      type: "SYNC_COMPLETE",
      vaultId: "vault-1",
    });
    expect(state.loadPhase).toBeNull();
  });

  it("reads disk when the cache becomes empty during the folder permission check", async () => {
    const { loader, repository, deps } = fixture();
    const hero = { id: "hero" } as LocalEntity;
    const snapshot = new Map([["hero", { entity: hero, lastModified: 1 }]]);
    vi.mocked(cacheService.preloadVault).mockResolvedValue(snapshot);
    deps.getActiveFolderHandle.mockImplementationOnce(async () => {
      snapshot.clear();
      return undefined;
    });

    await loader.loadFiles();

    expect(repository.loadFiles).toHaveBeenCalledOnce();
  });

  it("throws the existing typed errors and keeps the repository error as the cause", async () => {
    const { loader, deps, repository, state } = fixture();
    deps.getActiveVaultHandle.mockResolvedValueOnce(undefined);
    await expect(
      loader.loadFiles(false, { throwOnError: true }),
    ).rejects.toMatchObject({ code: "vault_handle_missing" });
    const cause = new Error("unreadable files");
    repository.loadFiles.mockRejectedValueOnce(cause);
    await expect(
      loader.loadFiles(false, { throwOnError: true }),
    ).rejects.toEqual(
      new VaultSyncError("vault_load_failed", "unreadable files", cause),
    );
    expect(state.status).toBe("error");
    expect(state.loadPhase).toBeNull();
  });

  it("does not let a superseded cache preload clear a newer load's parsing phase", async () => {
    const { loader, repository, state } = fixture();
    const preload =
      Promise.withResolvers<
        Awaited<ReturnType<typeof cacheService.preloadVault>>
      >();
    const parse = Promise.withResolvers<Record<string, LocalEntity>>();
    const parsing = Promise.withResolvers<void>();
    vi.mocked(cacheService.preloadVault).mockReturnValueOnce(preload.promise);
    const first = loader.loadFiles(false);
    repository.loadFiles.mockImplementationOnce(() => {
      parsing.resolve();
      return parse.promise;
    });
    const second = loader.loadFiles(false);
    await parsing.promise;
    preload.resolve(new Map());
    await first;
    expect(state.loadPhase).toBe("parsing");
    parse.resolve({});
    await second;
    expect(state.loadPhase).toBeNull();
  });

  it("treats an aborted repository load as cancellation without a completion event", async () => {
    const { loader, repository, state } = fixture();
    const emit = vi.spyOn(vaultEventBus, "emit");
    repository.loadFiles.mockRejectedValueOnce(
      new DOMException("Aborted", "AbortError"),
    );
    await expect(
      loader.loadFiles(false, { throwOnError: true }),
    ).resolves.toBeUndefined();
    expect(state.status).toBe("idle");
    expect(
      emit.mock.calls.some(([event]) => event.type === "SYNC_COMPLETE"),
    ).toBe(false);
  });
});

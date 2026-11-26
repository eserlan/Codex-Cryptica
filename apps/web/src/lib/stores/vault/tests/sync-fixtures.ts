import { vi } from "vitest";
import type { SyncCoordinator, VaultRepository } from "@codex/vault-engine";
import type { VaultRecord } from "../../../utils/idb";
import type { LocalEntity } from "../types";
import { VaultSyncState } from "../sync-state.svelte";
import { VaultSyncContext } from "../sync-context";
import type { SyncStoreDependencies } from "../sync-types";

export function createSyncFixture() {
  let vaultId: string | null = "vault-1";
  const handle = {} as FileSystemDirectoryHandle;
  const repository = {
    entities: {} as Record<string, LocalEntity>,
    pendingSaveCount: 0,
    loadFiles: vi.fn<VaultRepository["loadFiles"]>().mockResolvedValue({}),
    waitForAllSaves: vi.fn().mockResolvedValue(undefined),
  };
  const coordinator = {
    push: vi.fn<SyncCoordinator["push"]>().mockResolvedValue(),
    pull: vi.fn<SyncCoordinator["pull"]>().mockResolvedValue(),
    syncWithLocalFolder: vi
      .fn<SyncCoordinator["syncWithLocalFolder"]>()
      .mockResolvedValue(),
    cleanupConflictFiles: vi
      .fn<SyncCoordinator["cleanupConflictFiles"]>()
      .mockResolvedValue(),
  };
  const deps = {
    activeVaultId: () => vaultId,
    activeVaultRecord: () =>
      ({ lastInternalChange: 0, lastSavedToFolder: 0 }) as VaultRecord,
    repository: repository as unknown as VaultRepository,
    getSyncCoordinator: vi
      .fn()
      .mockResolvedValue(coordinator as unknown as SyncCoordinator),
    getActiveVaultHandle: vi.fn().mockResolvedValue(handle),
    getActiveFolderHandle: vi.fn().mockResolvedValue(undefined),
    ensureServicesInitialized: vi.fn().mockResolvedValue(undefined),
    loadMaps: vi.fn().mockResolvedValue(undefined),
    loadCanvases: vi.fn().mockResolvedValue(undefined),
    loadPublishRegistry: vi.fn().mockResolvedValue(undefined),
    updateEntityCount: vi.fn().mockResolvedValue(undefined),
    flushPendingSaves: vi.fn().mockResolvedValue(undefined),
  } satisfies SyncStoreDependencies;
  return {
    deps,
    handle,
    repository,
    coordinator,
    state: new VaultSyncState(deps),
    context: new VaultSyncContext(deps),
    switchVault: (id: string | null) => {
      vaultId = id;
    },
  };
}

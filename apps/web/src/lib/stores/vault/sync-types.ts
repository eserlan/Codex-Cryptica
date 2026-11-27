import type { SyncCoordinator, VaultRepository } from "@codex/vault-engine";
import type { VaultRecord } from "../../utils/idb";

export interface LoadFilesOptions {
  reuseCache?: boolean;
  deferAuxiliary?: boolean;
  throwOnError?: boolean;
  onCacheReady?: (info: { cacheState: "warm" | "cold"; count: number }) => void;
  onAuxiliaryDegraded?: (source: string) => void;
}

export class VaultSyncError extends Error {
  constructor(
    public readonly code: "vault_handle_missing" | "vault_load_failed",
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "VaultSyncError";
  }
}

export interface SyncStoreDependencies {
  activeVaultId: () => string | null;
  activeVaultRecord: () => VaultRecord | undefined;
  repository: VaultRepository;
  getSyncCoordinator: () => Promise<SyncCoordinator | null>;
  getActiveVaultHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  getActiveFolderHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
  ensureServicesInitialized: () => Promise<void>;
  loadMaps: (vaultId: string) => Promise<void>;
  loadCanvases: (vaultId: string) => Promise<void>;
  loadPublishRegistry?: (
    vaultId: string,
    vaultHandle: FileSystemDirectoryHandle,
  ) => Promise<void>;
  updateEntityCount: (vaultId: string, count: number) => Promise<void>;
  flushPendingSaves?: (timeoutMs?: number) => Promise<void>;
}

/**
 * Proposed updates to VaultStore (apps/web/src/lib/stores/vault.svelte.ts)
 */

export interface VaultRecord {
  id: string;
  name: string;
  createdAt: number;
  lastOpenedAt: number;
  entityCount: number;
}

export interface IVaultService {
  // State
  activeVaultId: string | null;
  vaultName: string;
  availableVaults: VaultRecord[];

  // Lifecycle
  init(): Promise<void>;
  closeVault(): Promise<void>;

  // Multi-vault Actions
  listVaults(): Promise<VaultRecord[]>;
  createVault(name: string): Promise<string>;
  switchVault(id: string): Promise<void>;
  renameVault(id: string, newName: string): Promise<void>;
  deleteVault(id: string): Promise<void>;

  // Optional FSA Sync
  syncToFolder(): Promise<void>;
  importFromFolder(): Promise<void>;
}

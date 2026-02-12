import { describe, it, expect, vi, beforeEach } from 'vitest';
import { vault } from './vault.svelte';

const { mockDB, mockRoot } = vi.hoisted(() => {
  return {
    mockDB: {
      get: vi.fn(),
      put: vi.fn(),
      getAll: vi.fn(),
      delete: vi.fn(),
    },
    mockRoot: {
      getDirectoryHandle: vi.fn().mockResolvedValue({
        entries: async function* () { },
        getFileHandle: vi.fn(),
        removeEntry: vi.fn(),
      }),
      entries: async function* () { },
    }
  };
});

vi.mock('../utils/idb', () => ({
  getDB: vi.fn().mockResolvedValue(mockDB),
  getPersistedHandle: vi.fn(),
  clearPersistedHandle: vi.fn(),
}));

vi.mock('../utils/opfs', () => ({
  getOpfsRoot: vi.fn().mockResolvedValue(mockRoot),
  getVaultDir: vi.fn().mockResolvedValue(mockRoot),
  createVaultDir: vi.fn().mockResolvedValue(mockRoot),
  deleteVaultDir: vi.fn().mockResolvedValue(undefined),
  getOrCreateDir: vi.fn().mockResolvedValue(mockRoot),
  walkOpfsDirectory: vi.fn().mockResolvedValue([]),
  writeOpfsFile: vi.fn(),
  deleteOpfsEntry: vi.fn(),
  readOpfsBlob: vi.fn(),
  readFileAsText: vi.fn(),
}));

// Mock Search/Cache/Debug
vi.mock('../services/search', () => ({ searchService: { clear: vi.fn(), index: vi.fn(), remove: vi.fn() } }));
vi.mock('../services/cache', () => ({ cacheService: { get: vi.fn(), set: vi.fn() } }));
vi.mock('./debug.svelte', () => ({ debugStore: { log: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

describe('VaultStore Multi-Vault', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vault.activeVaultId = null;
    vault.entities = {};
  });

  it('should list vaults from IDB', async () => {
    const vaults = [{ id: 'v1', name: 'Vault 1', lastOpenedAt: 100 }];
    mockDB.getAll.mockResolvedValue(vaults);

    await vault.listVaults();
    expect(vault.availableVaults).toEqual(vaults);
  });

  it('should switch vault', async () => {
    const targetVault = { id: 'v2', name: 'Vault 2', lastOpenedAt: 100 };
    mockDB.get.mockImplementation((store, key) => {
      if (store === 'vaults' && key === 'v2') return targetVault;
      return null;
    });

    await vault.switchVault('v2');

    expect(vault.activeVaultId).toBe('v2');
    expect(vault.vaultName).toBe('Vault 2');
    expect(mockDB.put).toHaveBeenCalledWith('settings', 'v2', 'activeVaultId');
  });
});

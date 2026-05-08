import { beforeEach, describe, expect, it, vi } from "vitest";

const getTokenWithScope = vi.fn();
const runSync = vi.fn();
const createVault = vi.fn();
const getActiveVaultHandle = vi.fn();
const getSpecificVaultHandle = vi.fn();
const getMetadata = vi.fn();
const saveMetadata = vi.fn();
const clearMetadata = vi.fn();
const listVaults = vi.fn();
const emit = vi.fn();
const getDB = vi.fn();

vi.mock("../lib/services/gdrive-auth", () => ({
  gdriveAuthService: {
    getAccessToken: vi.fn(),
    getTokenWithScope,
    signOut: vi.fn(),
  },
}));

vi.mock("comlink", () => ({
  proxy: (value: unknown) => value,
  wrap: () => ({ runSync }),
}));

vi.mock("@codex/events", () => ({
  appEventBus: { emit },
}));

vi.mock("@codex/sync-engine", () => ({
  CloudSyncMetadataService: vi.fn().mockImplementation(function () {
    return {
      clearMetadata,
      getMetadata,
      saveMetadata,
    };
  }),
  GDriveBackend: vi.fn().mockImplementation(function () {
    return {
      connect: vi.fn(),
      setVaultFolderId: vi.fn(),
    };
  }),
  SyncRegistry: vi.fn().mockImplementation(function () {
    return {};
  }),
}));

vi.mock("../lib/utils/idb", () => ({ getDB }));

vi.mock("../lib/stores/vault.svelte", () => ({
  vault: {
    activeVaultId: "new-vault-id",
    activeVaultRecord: { name: "New Vault" },
    createVault,
    getActiveVaultHandle,
    getSpecificVaultHandle,
  },
}));

vi.mock("../lib/stores/vault/registry", () => ({
  listVaults,
}));

describe("gdrive-sync shared vault joins", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getTokenWithScope.mockResolvedValue("drive-file-token");
    getDB.mockResolvedValue({});
    listVaults.mockResolvedValue([]);
    createVault.mockResolvedValue("new-vault-id");
    getMetadata.mockResolvedValue({
      remoteFolderId: "shared-folder-id-1234567890",
    });
    getActiveVaultHandle.mockResolvedValue({ kind: "directory" });
    getSpecificVaultHandle.mockResolvedValue({ kind: "directory" });
    runSync.mockResolvedValue(undefined);

    vi.stubGlobal(
      "Worker",
      vi.fn().mockImplementation(function () {
        return {};
      }),
    );
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("navigator", { onLine: true });
  });

  it("should join shared vaults with the broader drive scope", async () => {
    const { joinSharedVault } = await import("../lib/services/gdrive-sync");
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "shared-folder-id-1234567890",
        name: "Shared Campaign",
        trashed: false,
      }),
    } as Response);

    await joinSharedVault("shared-folder-id-1234567890");

    expect(getTokenWithScope).toHaveBeenCalledWith(
      "https://www.googleapis.com/auth/drive",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.googleapis.com/drive/v3/files/shared-folder-id-1234567890?fields=id,name,trashed",
      { headers: { Authorization: "Bearer drive-file-token" } },
    );
    expect(saveMetadata).toHaveBeenCalledWith({
      vaultId: "new-vault-id",
      remoteFolderId: "shared-folder-id-1234567890",
      lastSyncTime: 0,
      lastSyncToken: null,
    });
    expect(runSync).toHaveBeenCalled();
  });

  it("should reject invalid shared vault links before requesting auth", async () => {
    const { joinSharedVault } = await import("../lib/services/gdrive-sync");

    await expect(joinSharedVault("not a drive folder")).rejects.toThrow(
      "Could not extract a folder ID from that link.",
    );

    expect(getTokenWithScope).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});

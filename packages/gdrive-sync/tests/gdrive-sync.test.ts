import { beforeEach, describe, it, expect, vi } from "vitest";
import {
  DriveRestClient,
  configureGDriveSync,
  connectVaultToDrive,
  disconnectVaultFromDrive,
  driveRest,
  gdriveAuthService,
  importVaultFromDrive,
  listDriveVaults,
  parseDriveFolderUrl,
  pullVaultFromDrive,
  pushVaultToDrive,
} from "../src";

const ok = (body: unknown) => ({
  ok: true,
  json: () => Promise.resolve(body),
});

describe("DriveRestClient (injected fetcher)", () => {
  it("returns an existing folder id without creating one", async () => {
    const fetcher = vi.fn().mockResolvedValue(ok({ files: [{ id: "f1" }] }));
    const client = new DriveRestClient(fetcher as any);

    const id = await client.findOrCreateFolder("tok", "Vault");

    expect(id).toBe("f1");
    expect(fetcher).toHaveBeenCalledOnce(); // search only, no create
  });

  it("creates a folder when none exists", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(ok({ files: [] }))
      .mockResolvedValueOnce(ok({ id: "new" }));
    const client = new DriveRestClient(fetcher as any);

    const id = await client.findOrCreateFolder("tok", "Vault", "parent");

    expect(id).toBe("new");
    expect(fetcher).toHaveBeenCalledTimes(2);
    const createInit = fetcher.mock.calls[1][1];
    expect(createInit.method).toBe("POST");
    expect(JSON.parse(createInit.body).parents).toEqual(["parent"]);
  });

  it("lists subfolders via the injected fetcher", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(ok({ files: [{ id: "a", name: "A" }] }));
    const client = new DriveRestClient(fetcher as any);

    const folders = await client.listSubfolders("tok", "root");

    expect(folders).toEqual([{ id: "a", name: "A" }]);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("sends the auth header and never touches the global fetch", async () => {
    const globalFetch = vi.fn();
    vi.stubGlobal("fetch", globalFetch);
    try {
      const fetcher = vi.fn().mockResolvedValue(ok({ files: [{ id: "x" }] }));

      await new DriveRestClient(fetcher as any).findOrCreateFolder("tok", "V");

      const init = fetcher.mock.calls[0][1];
      expect(init.headers.Authorization).toBe("Bearer tok");
      expect(globalFetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("escapes single quotes in folder names so the query stays valid", async () => {
    const fetcher = vi.fn().mockResolvedValue(ok({ files: [{ id: "x" }] }));
    await new DriveRestClient(fetcher as any).findOrCreateFolder(
      "tok",
      "O'Reilly",
    );
    const url = String(fetcher.mock.calls[0][0]);
    // encoded `name='O\'Reilly'` — the apostrophe is backslash-escaped.
    expect(decodeURIComponent(url)).toContain("name='O\\'Reilly'");
  });

  it("getFolderMetadataResponse hits the file endpoint via the injected fetcher", async () => {
    const response = ok({ id: "f", name: "F", trashed: false });
    const fetcher = vi.fn().mockResolvedValue(response);

    const res = await new DriveRestClient(
      fetcher as any,
    ).getFolderMetadataResponse("tok", "folder-1");

    expect(res).toBe(response);
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).toContain("/files/folder-1?fields=id,name,trashed");
    expect((init as any).headers.Authorization).toBe("Bearer tok");
  });

  it("throws when the folder search request fails", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false });
    const client = new DriveRestClient(fetcher as any);

    await expect(client.findOrCreateFolder("tok", "Vault")).rejects.toThrow(
      'Failed to search Drive for folder "Vault"',
    );
  });

  it("throws when the folder create request fails", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(ok({ files: [] }))
      .mockResolvedValueOnce({ ok: false });
    const client = new DriveRestClient(fetcher as any);

    await expect(client.findOrCreateFolder("tok", "Vault")).rejects.toThrow(
      'Failed to create Drive folder "Vault"',
    );
  });

  it("throws when listing subfolders fails", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false });
    const client = new DriveRestClient(fetcher as any);

    await expect(client.listSubfolders("tok", "root")).rejects.toThrow(
      "Failed to list Drive vaults",
    );
  });
});

const { runSync } = vi.hoisted(() => ({ runSync: vi.fn() }));
const createVault = vi.fn();
const switchVault = vi.fn();
const getActiveVaultHandle = vi.fn();
const getSpecificVaultHandle = vi.fn();
const getMetadata = vi.fn();
const saveMetadata = vi.fn();
const clearMetadata = vi.fn();
const listVaults = vi.fn();
const emit = vi.fn();
const getDB = vi.fn();
const connect = vi.fn();
const setVaultFolderId = vi.fn();

vi.mock("comlink", () => ({
  proxy: (value: unknown) => value,
  wrap: () => ({ runSync: (...args: unknown[]) => runSync(...args) }),
}));

vi.mock("@codex/sync-engine", () => ({
  CloudSyncMetadataService: vi.fn().mockImplementation(function () {
    return { clearMetadata, getMetadata, saveMetadata };
  }),
  GDriveBackend: vi.fn().mockImplementation(function () {
    return { connect, setVaultFolderId };
  }),
  SyncRegistry: vi.fn().mockImplementation(function () {
    return {};
  }),
}));

describe("gdrive-sync core operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(gdriveAuthService, "getAccessToken").mockResolvedValue(
      "access-token",
    );

    getDB.mockResolvedValue({});
    listVaults.mockResolvedValue([]);
    createVault.mockResolvedValue("new-vault-id");
    getMetadata.mockResolvedValue({ remoteFolderId: "existing-folder-id" });
    getActiveVaultHandle.mockResolvedValue({ kind: "directory" });
    getSpecificVaultHandle.mockResolvedValue({ kind: "directory" });

    configureGDriveSync({
      getDB,
      dbName: "TestDB",
      dbVersion: 1,
      appEventBus: { emit },
      vault: {
        activeVaultId: "active-vault-id",
        activeVaultRecord: { name: "Active Vault" },
        createVault,
        switchVault,
        getActiveVaultHandle,
        getSpecificVaultHandle,
      },
      listVaults,
    });

    vi.stubGlobal(
      "Worker",
      vi.fn().mockImplementation(function () {
        return {};
      }),
    );
    vi.stubGlobal("navigator", { onLine: true });
  });

  describe("connectVaultToDrive", () => {
    it("creates a root and vault folder when no folderId is given", async () => {
      const findOrCreate = vi
        .spyOn(driveRest, "findOrCreateFolder")
        .mockResolvedValueOnce("root-folder-id")
        .mockResolvedValueOnce("vault-folder-id");

      await connectVaultToDrive("active-vault-id");

      expect(findOrCreate).toHaveBeenNthCalledWith(
        1,
        "access-token",
        "CodexCryptica",
      );
      expect(findOrCreate).toHaveBeenNthCalledWith(
        2,
        "access-token",
        "Active Vault",
        "root-folder-id",
      );
      expect(saveMetadata).toHaveBeenCalledWith({
        vaultId: "active-vault-id",
        remoteFolderId: "vault-folder-id",
        lastSyncTime: 0,
        lastSyncToken: null,
      });
      expect(emit).toHaveBeenCalledWith(
        expect.objectContaining({ type: "SYNC:DRIVE_CONNECTED" }),
      );
    });

    it("validates an existing folder when folderId is given", async () => {
      await connectVaultToDrive("active-vault-id", "given-folder-id");

      expect(setVaultFolderId).toHaveBeenCalledWith("given-folder-id");
      expect(connect).toHaveBeenCalled();
      expect(saveMetadata).toHaveBeenCalledWith(
        expect.objectContaining({ remoteFolderId: "given-folder-id" }),
      );
    });

    it("throws if not authenticated", async () => {
      vi.spyOn(gdriveAuthService, "getAccessToken").mockResolvedValue(null);

      await expect(connectVaultToDrive("active-vault-id")).rejects.toThrow(
        "Authentication failed",
      );
    });
  });

  describe("disconnectVaultFromDrive", () => {
    it("clears metadata and emits SYNC:DRIVE_DISCONNECTED", async () => {
      await disconnectVaultFromDrive("active-vault-id");

      expect(clearMetadata).toHaveBeenCalledWith("active-vault-id");
      expect(emit).toHaveBeenCalledWith(
        expect.objectContaining({ type: "SYNC:DRIVE_DISCONNECTED" }),
      );
    });
  });

  describe("pushVaultToDrive / pullVaultFromDrive", () => {
    it("runs a push sync for the active vault via the worker", async () => {
      await pushVaultToDrive("active-vault-id");

      expect(runSync).toHaveBeenCalledWith(
        "active-vault-id",
        "push",
        "existing-folder-id",
        { kind: "directory" },
        expect.anything(),
        expect.anything(),
        "TestDB",
        1,
      );
      expect(getActiveVaultHandle).toHaveBeenCalled();
      expect(getSpecificVaultHandle).not.toHaveBeenCalled();
    });

    it("runs a pull sync and resolves storage via getSpecificVaultHandle for a non-active vault", async () => {
      await pullVaultFromDrive("other-vault-id");

      expect(runSync).toHaveBeenCalledWith(
        "other-vault-id",
        "pull",
        "existing-folder-id",
        { kind: "directory" },
        expect.anything(),
        expect.anything(),
        "TestDB",
        1,
      );
      expect(getSpecificVaultHandle).toHaveBeenCalledWith("other-vault-id");
    });

    it("throws if the vault is not connected to Drive", async () => {
      getMetadata.mockResolvedValue(null);

      await expect(pushVaultToDrive("active-vault-id")).rejects.toThrow(
        "Google Drive not connected for this vault",
      );
      expect(runSync).not.toHaveBeenCalled();
    });

    it("throws if the vault storage handle cannot be resolved", async () => {
      getActiveVaultHandle.mockResolvedValue(null);

      await expect(pushVaultToDrive("active-vault-id")).rejects.toThrow(
        "Failed to resolve vault storage handle",
      );
      expect(runSync).not.toHaveBeenCalled();
    });

    it("is a no-op while offline", async () => {
      vi.stubGlobal("navigator", { onLine: false });

      await pushVaultToDrive("active-vault-id");

      expect(runSync).not.toHaveBeenCalled();
    });
  });

  describe("listDriveVaults", () => {
    it("lists subfolders of the CodexCryptica root", async () => {
      vi.spyOn(driveRest, "findOrCreateFolder").mockResolvedValue(
        "root-folder-id",
      );
      const listSubfolders = vi
        .spyOn(driveRest, "listSubfolders")
        .mockResolvedValue([{ id: "v1", name: "Vault One" }]);

      const result = await listDriveVaults();

      expect(listSubfolders).toHaveBeenCalledWith(
        "access-token",
        "root-folder-id",
      );
      expect(result).toEqual([{ id: "v1", name: "Vault One" }]);
    });

    it("throws if not authenticated", async () => {
      vi.spyOn(gdriveAuthService, "getAccessToken").mockResolvedValue(null);

      await expect(listDriveVaults()).rejects.toThrow("Authentication failed");
    });
  });

  describe("importVaultFromDrive", () => {
    it("switches to an already-matching local vault instead of creating one", async () => {
      listVaults.mockResolvedValue([{ id: "matched-vault", name: "Matched" }]);
      getMetadata.mockResolvedValue({ remoteFolderId: "drive-folder-id" });

      await importVaultFromDrive("drive-folder-id", "Matched");

      expect(createVault).not.toHaveBeenCalled();
      expect(switchVault).toHaveBeenCalledWith("matched-vault");
      expect(runSync).toHaveBeenCalled();
    });

    it("does not switch again when the matching vault is already active", async () => {
      listVaults.mockResolvedValue([
        { id: "active-vault-id", name: "Active Vault" },
      ]);
      getMetadata.mockResolvedValue({ remoteFolderId: "drive-folder-id" });

      await importVaultFromDrive("drive-folder-id", "Active Vault");

      expect(switchVault).not.toHaveBeenCalled();
    });

    it("throws if creating a new local vault fails", async () => {
      listVaults.mockResolvedValue([]);
      getMetadata.mockResolvedValue(null);
      createVault.mockResolvedValue(null);

      await expect(
        importVaultFromDrive("drive-folder-id", "New Vault"),
      ).rejects.toThrow("Failed to create local vault");
    });
  });

  describe("parseDriveFolderUrl", () => {
    it("extracts the folder ID from a share URL", () => {
      expect(
        parseDriveFolderUrl(
          "https://drive.google.com/drive/folders/abc123DEF456?usp=sharing",
        ),
      ).toBe("abc123DEF456");
    });

    it("accepts a bare folder ID", () => {
      const id = "a".repeat(30);
      expect(parseDriveFolderUrl(id)).toBe(id);
    });

    it("returns null for unparseable input", () => {
      expect(parseDriveFolderUrl("not a folder id or url")).toBeNull();
    });
  });
});

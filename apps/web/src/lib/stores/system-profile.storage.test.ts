import { beforeEach, describe, expect, it, vi } from "vitest";
import { SYSTEM_NEUTRAL_ID, TOV_SYSTEM_ID } from "schema";
import {
  createSystemProfileStorage,
  type SystemProfileStorageDependencies,
} from "./system-profile.svelte";
import {
  createVaultConfigUpdater,
  type VaultConfigDependencies,
} from "../utils/vault-config";

const root = {} as FileSystemDirectoryHandle;
const vaultDir = {} as FileSystemDirectoryHandle;

describe("default system profile persistence adapter", () => {
  let db: {
    get: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let readFileAsText: ReturnType<
    typeof vi.fn<VaultConfigDependencies["readFileAsText"]>
  >;
  let writeOpfsFile: ReturnType<
    typeof vi.fn<VaultConfigDependencies["writeOpfsFile"]>
  >;
  let storage: ReturnType<typeof createSystemProfileStorage>;

  beforeEach(() => {
    db = {
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    readFileAsText = vi.fn<VaultConfigDependencies["readFileAsText"]>();
    writeOpfsFile = vi
      .fn<VaultConfigDependencies["writeOpfsFile"]>()
      .mockResolvedValue(undefined);
    const updateVaultConfig = createVaultConfigUpdater({
      getOpfsRoot: vi
        .fn<VaultConfigDependencies["getOpfsRoot"]>()
        .mockResolvedValue(root),
      getVaultDir: vi
        .fn<VaultConfigDependencies["getVaultDir"]>()
        .mockResolvedValue(vaultDir),
      readFileAsText,
      writeOpfsFile,
    });
    storage = createSystemProfileStorage({
      getDB: vi.fn().mockResolvedValue(db),
      getOpfsRoot: vi.fn().mockResolvedValue(root),
      getVaultDir: vi.fn().mockResolvedValue(vaultDir),
      readFileAsText,
      updateVaultConfig,
    } as unknown as SystemProfileStorageDependencies);
  });

  it("uses the vault-scoped IndexedDB key and deletes the cache for neutral", async () => {
    db.get.mockResolvedValue(TOV_SYSTEM_ID);

    await expect(storage.loadFromCache("vault-1")).resolves.toBe(TOV_SYSTEM_ID);
    expect(db.get).toHaveBeenCalledWith("settings", "system_profile_vault-1");

    await storage.saveToCache("vault-1", SYSTEM_NEUTRAL_ID);
    expect(db.delete).toHaveBeenCalledWith(
      "settings",
      "system_profile_vault-1",
    );
    expect(db.put).not.toHaveBeenCalled();
  });

  it("loads the legacy system field when systemId is absent", async () => {
    readFileAsText.mockResolvedValue(JSON.stringify({ system: TOV_SYSTEM_ID }));

    await expect(storage.loadFromDisk("vault-2")).resolves.toBe(TOV_SYSTEM_ID);
    expect(readFileAsText).toHaveBeenCalledWith(vaultDir, [
      ".codex",
      "config.json",
    ]);
  });

  it("merges systemId into the existing config and removes both aliases for neutral", async () => {
    readFileAsText.mockResolvedValue(
      JSON.stringify({ theme: "fantasy", system: "legacy", extra: true }),
    );

    await storage.saveToDisk("vault-3", TOV_SYSTEM_ID);
    let savedConfig = JSON.parse(writeOpfsFile.mock.calls[0][1] as string);
    expect(savedConfig).toEqual({
      theme: "fantasy",
      system: "legacy",
      extra: true,
      systemId: TOV_SYSTEM_ID,
    });

    await storage.saveToDisk("vault-3", SYSTEM_NEUTRAL_ID);
    savedConfig = JSON.parse(writeOpfsFile.mock.calls[1][1] as string);
    expect(savedConfig).toEqual({ theme: "fantasy", extra: true });
  });

  it("falls back safely when persistence dependencies fail", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const failingStorage = createSystemProfileStorage({
      getDB: vi.fn().mockRejectedValue(new Error("database unavailable")),
      getOpfsRoot: vi.fn().mockRejectedValue(new Error("OPFS unavailable")),
      getVaultDir: vi.fn(),
      readFileAsText: vi.fn(),
      updateVaultConfig: vi.fn().mockRejectedValue(new Error("write failed")),
    } as unknown as SystemProfileStorageDependencies);

    await expect(failingStorage.loadFromCache("vault-4")).resolves.toBeNull();
    await expect(failingStorage.loadFromDisk("vault-4")).resolves.toBeNull();
    await expect(
      failingStorage.saveToCache("vault-4", TOV_SYSTEM_ID),
    ).resolves.toBeUndefined();
    await expect(
      failingStorage.saveToDisk("vault-4", TOV_SYSTEM_ID),
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

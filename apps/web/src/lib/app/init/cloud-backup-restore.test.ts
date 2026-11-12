import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCloudBackupRestore } from "./cloud-backup-restore";

const mocks = vi.hoisted(() => ({
  vault: {
    createVault: vi.fn(),
    batchCreateEntities: vi.fn(),
    getActiveVaultHandle: vi.fn(),
    activeVaultId: "new-vault",
  },
  maps: { maps: {} as Record<string, unknown>, saveMaps: vi.fn() },
  canvases: { canvases: {} as Record<string, unknown>, saveCanvas: vi.fn() },
  put: vi.fn(),
  writeOpfsFile: vi.fn(),
}));
vi.mock("#lib/stores/vault.svelte.js", () => ({ vault: mocks.vault }));
vi.mock("#lib/stores/map-registry.svelte.js", () => ({
  mapRegistry: mocks.maps,
}));
vi.mock("#lib/stores/canvas-registry.svelte.js", () => ({
  canvasRegistry: mocks.canvases,
}));
vi.mock("#lib/utils/idb.js", () => ({
  getDB: async () => ({ put: mocks.put }),
}));
vi.mock("#lib/utils/opfs.js", () => ({ writeOpfsFile: mocks.writeOpfsFile }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.maps.maps = {};
  mocks.canvases.canvases = {};
});

describe("cloud backup restore adapters", () => {
  it("creates a vault and passes entities to its batch importer", async () => {
    mocks.vault.createVault.mockResolvedValue("new-vault");
    const restore = createCloudBackupRestore();
    expect(await restore.createVault("Restored world")).toBe("new-vault");
    const entities = [{ id: "entity-1", content: "Full lore" }];
    await restore.importEntities("new-vault", entities);
    expect(mocks.vault.createVault).toHaveBeenCalledWith("Restored world");
    expect(mocks.vault.batchCreateEntities).toHaveBeenCalledWith(entities);
  });

  it("persists valid maps and canvases and skips records without IDs", async () => {
    const restore = createCloudBackupRestore();
    const map = { id: "map-1" };
    const canvas = { id: "canvas-1" };
    await restore.importMaps!("new-vault", [null, {}, map]);
    await restore.importCanvases!("new-vault", [null, {}, canvas]);
    expect(mocks.maps.maps).toEqual({ "map-1": map });
    expect(mocks.canvases.canvases).toEqual({ "canvas-1": canvas });
    expect(mocks.maps.saveMaps).toHaveBeenCalledOnce();
    expect(mocks.canvases.saveCanvas).toHaveBeenCalledExactlyOnceWith(
      "canvas-1",
    );
  });

  it("rewrites restored journal ownership to the destination vault", async () => {
    const restore = createCloudBackupRestore();
    await restore.importSessionJournals!("new-vault", [
      null,
      {},
      { id: "journal-1", vaultId: "old-vault", startedAt: 1 },
    ]);
    expect(mocks.put).toHaveBeenCalledExactlyOnceWith("session_journals", {
      id: "journal-1",
      vaultId: "new-vault",
      startedAt: 1,
    });
  });

  it("writes raw media at its original path with its MIME type", async () => {
    const root = {};
    mocks.vault.getActiveVaultHandle.mockResolvedValue(root);
    const bytes = new Uint8Array([1, 2, 3]);
    await createCloudBackupRestore().importAsset!(
      "/maps//mask.png",
      bytes,
      "image/png",
    );
    expect(mocks.writeOpfsFile).toHaveBeenCalledWith(
      ["maps", "mask.png"],
      expect.any(Blob),
      root,
      "new-vault",
    );
    const blob: Blob = mocks.writeOpfsFile.mock.calls[0][1];
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBe(bytes.length);
    const reader = new FileReader();
    const content = new Promise<ArrayBuffer>((resolve) => {
      reader.onload = () => resolve(reader.result as ArrayBuffer);
    });
    reader.readAsArrayBuffer(blob);
    expect(new Uint8Array(await content)).toEqual(bytes);
  });

  it("rejects media restoration when no vault is open", async () => {
    mocks.vault.getActiveVaultHandle.mockResolvedValue(null);
    await expect(
      createCloudBackupRestore().importAsset!(
        "mask.png",
        new Uint8Array(),
        "image/png",
      ),
    ).rejects.toThrow("No vault is open to restore into.");
    expect(mocks.writeOpfsFile).not.toHaveBeenCalled();
  });

  it("ignores empty media paths", async () => {
    mocks.vault.getActiveVaultHandle.mockResolvedValue({});
    await createCloudBackupRestore().importAsset!(
      "///",
      new Uint8Array(),
      "image/png",
    );
    expect(mocks.writeOpfsFile).not.toHaveBeenCalled();
  });

  it("propagates storage failures", async () => {
    mocks.maps.saveMaps.mockRejectedValue(new Error("disk full"));
    await expect(
      createCloudBackupRestore().importMaps!("new-vault", [{ id: "map-1" }]),
    ).rejects.toThrow("disk full");
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  fetchCloudBackupAsset,
  restoreVaultFromCloudBackup,
} from "@codex/cloud-backup-sync";
import {
  restoreCloudBackupIntoNewVault,
  CloudBackupRestore,
} from "./cloud-backup-restore";
import { createInertRuntime } from "./cloud-backup-runtime";
import type { CloudBackupDeps } from "./cloud-backup-types";

vi.mock("@codex/cloud-backup-sync", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchCloudBackupAsset: vi.fn(),
  restoreVaultFromCloudBackup: vi.fn(),
}));

const credentials = { backupId: "backup", ownerCode: "code" };
function material(bundle: unknown) {
  return {
    manifest: { vaultTitle: "Restored" },
    bundle,
  } as Parameters<typeof restoreCloudBackupIntoNewVault>[3];
}
function target(): NonNullable<CloudBackupDeps["restore"]> {
  return {
    createVault: vi.fn(async () => "new-vault"),
    importEntities: vi.fn(async () => {}),
    importMaps: vi.fn(async () => {}),
    importCanvases: vi.fn(async () => {}),
    importSessionJournals: vi.fn(async () => {}),
  };
}

describe("cloud backup restore", () => {
  it("creates the vault before importing collections in order", async () => {
    const restore = target();
    const log: string[] = [];
    restore.createVault = async () => {
      log.push("create");
      return "new-vault";
    };
    for (const key of [
      "importEntities",
      "importMaps",
      "importCanvases",
      "importSessionJournals",
    ] as const) {
      restore[key] = async function (vaultId, items) {
        expect(this).toBe(restore);
        expect(vaultId).toBe("new-vault");
        expect(items).toHaveLength(1);
        log.push(key);
      };
    }
    const result = await restoreCloudBackupIntoNewVault(
      createInertRuntime(),
      restore,
      credentials,
      material({
        entities: [1],
        maps: [2],
        canvases: [3],
        sessionJournals: [4],
      }),
    );
    expect(log).toEqual([
      "create",
      "importEntities",
      "importMaps",
      "importCanvases",
      "importSessionJournals",
    ]);
    expect(result).toEqual({
      vaultId: "new-vault",
      vaultTitle: "Restored",
      missingAssets: 0,
    });
  });

  it("ignores malformed collections and counts media without an importer", async () => {
    const restore = target();
    restore.importMaps = undefined;
    const result = await restoreCloudBackupIntoNewVault(
      createInertRuntime(),
      restore,
      credentials,
      material({ entities: {}, maps: [1], assetManifest: [{ assetId: "a" }] }),
    );
    expect(restore.importEntities).not.toHaveBeenCalled();
    expect(result.missingAssets).toBe(1);
  });

  it("continues past unreadable media and import failures", async () => {
    const restore = target();
    const bytes = new Uint8Array([1]);
    vi.mocked(fetchCloudBackupAsset)
      .mockResolvedValueOnce({ ok: false, error: "Missing" })
      .mockResolvedValue({ ok: true, value: bytes });
    restore.importAsset = vi
      .fn()
      .mockRejectedValueOnce(new Error("Disk full"))
      .mockResolvedValue(undefined);
    const assets = ["missing", "unwritable", "good"].map((assetId) => ({
      assetId,
      path: `${assetId}.png`,
      mimeType: "image/png",
    }));
    const result = await restoreCloudBackupIntoNewVault(
      createInertRuntime(),
      restore,
      credentials,
      material({ assetManifest: assets }),
    );
    expect(result.missingAssets).toBe(2);
    expect(restore.importAsset).toHaveBeenLastCalledWith(
      "good.png",
      bytes,
      "image/png",
    );
  });

  it("propagates collection failures before importing later content", async () => {
    const restore = target();
    restore.importEntities = vi
      .fn()
      .mockRejectedValue(new Error("Write failed"));
    await expect(
      restoreCloudBackupIntoNewVault(
        createInertRuntime(),
        restore,
        credentials,
        material({ entities: [1], maps: [2] }),
      ),
    ).rejects.toThrow("Write failed");
    expect(restore.importMaps).not.toHaveBeenCalled();
  });
});

describe("restore workflow", () => {
  it("does not fetch or create a vault without restore dependencies", async () => {
    const state = { errorMessage: null as string | null };
    const restore = new CloudBackupRestore(state, () => null);
    expect(await restore.fetchForRestore("backup", "code")).toBeNull();
    expect(await restore.restoreIntoNewVault("backup", "code")).toBeNull();
    expect(state.errorMessage).toBe(
      "Restore is not available in this context.",
    );
  });

  it("stages a successful download before creating a vault", async () => {
    const state = { errorMessage: null as string | null };
    const deps: CloudBackupDeps = {
      runtime: createInertRuntime(),
      activeVaultId: () => null,
      buildPayload: vi.fn(),
      restore: target(),
    };
    vi.mocked(restoreVaultFromCloudBackup).mockImplementationOnce(async () => {
      expect(deps.restore!.createVault).not.toHaveBeenCalled();
      return { ok: true, value: material({ entities: [1] }) };
    });
    expect(
      await new CloudBackupRestore(state, () => deps).restoreIntoNewVault(
        "backup",
        "code",
      ),
    ).toEqual({
      vaultId: "new-vault",
      vaultTitle: "Restored",
      missingAssets: 0,
    });
  });

  it("reports download and import failures without reporting success", async () => {
    const state = { errorMessage: null as string | null };
    const deps: CloudBackupDeps = {
      runtime: createInertRuntime(),
      activeVaultId: () => null,
      buildPayload: vi.fn(),
      restore: target(),
    };
    const restore = new CloudBackupRestore(state, () => deps);
    vi.mocked(restoreVaultFromCloudBackup).mockResolvedValueOnce({
      ok: false,
      error: "Download failed",
    });
    expect(await restore.restoreIntoNewVault("backup", "code")).toBeNull();
    expect(state.errorMessage).toBe("Download failed");
    expect(deps.restore!.createVault).not.toHaveBeenCalled();
    vi.mocked(restoreVaultFromCloudBackup).mockResolvedValueOnce({
      ok: true,
      value: material({}),
    });
    vi.mocked(deps.restore!.createVault).mockRejectedValueOnce(
      new Error("Storage failed"),
    );
    expect(await restore.restoreIntoNewVault("backup", "code")).toBeNull();
    expect(state.errorMessage).toBe("Storage failed");
  });
});

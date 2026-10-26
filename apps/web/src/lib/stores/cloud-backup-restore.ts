import {
  fetchCloudBackupAsset,
  type CloudBackupRuntime,
  restoreVaultFromCloudBackup,
} from "@codex/cloud-backup-sync";
import type {
  CloudBackupDepsProvider,
  CloudBackupViewState,
  CloudBackupDeps,
} from "./cloud-backup-types";

type RestoreTarget = NonNullable<CloudBackupDeps["restore"]>;
type RestoreMaterial = Extract<
  Awaited<ReturnType<typeof restoreVaultFromCloudBackup>>,
  { ok: true }
>["value"];
type RestoreCredentials = { backupId: string; ownerCode: string };
type RestoreAsset = { assetId: string; path: string; mimeType: string };

function listFrom(bundle: unknown, key: string): unknown[] {
  const value = (bundle as Record<string, unknown>)?.[key];
  return Array.isArray(value) ? value : [];
}

function readCollections(bundle: unknown) {
  return {
    entities: listFrom(bundle, "entities"),
    maps: listFrom(bundle, "maps"),
    canvases: listFrom(bundle, "canvases"),
    sessionJournals: listFrom(bundle, "sessionJournals"),
  };
}

/** Restore collections in order, preserving the vault receiver for each importer. */
async function importCollections(
  restore: RestoreTarget,
  vaultId: string,
  collections: ReturnType<typeof readCollections>,
): Promise<void> {
  if (collections.entities.length > 0) {
    await restore.importEntities(vaultId, collections.entities);
  }
  const optionalCollections = [
    ["maps", "importMaps"],
    ["canvases", "importCanvases"],
    ["sessionJournals", "importSessionJournals"],
  ] as const;
  for (const [key, method] of optionalCollections) {
    const items = collections[key];
    if (items.length > 0 && restore[method]) {
      await restore[method](vaultId, items);
    }
  }
}

async function restoreAsset(
  runtime: CloudBackupRuntime,
  credentials: RestoreCredentials,
  asset: RestoreAsset,
  importAsset: NonNullable<RestoreTarget["importAsset"]>,
): Promise<boolean> {
  const bytes = await fetchCloudBackupAsset(
    runtime,
    credentials,
    asset.assetId,
  );
  if (!bytes.ok) return false;
  try {
    await importAsset(asset.path, bytes.value, asset.mimeType);
    return true;
  } catch {
    return false;
  }
}

/** A missing image never undoes an otherwise successful restore. */
async function importAssets(
  runtime: CloudBackupRuntime,
  credentials: RestoreCredentials,
  bundle: unknown,
  importAsset: RestoreTarget["importAsset"],
): Promise<number> {
  const manifest = listFrom(bundle, "assetManifest") as RestoreAsset[];
  if (!importAsset) return manifest.length;
  let missing = 0;
  for (const asset of manifest) {
    if (!(await restoreAsset(runtime, credentials, asset, importAsset)))
      missing++;
  }
  return missing;
}

/** Material has already downloaded before a new vault is created (FR-006a). */
export async function restoreCloudBackupIntoNewVault(
  runtime: CloudBackupRuntime,
  restore: RestoreTarget,
  credentials: RestoreCredentials,
  material: RestoreMaterial,
): Promise<{ vaultId: string; vaultTitle: string; missingAssets: number }> {
  const collections = readCollections(material.bundle);
  const vaultTitle = material.manifest.vaultTitle;
  const vaultId = await restore.createVault(vaultTitle);
  await importCollections(restore, vaultId, collections);
  const missingAssets = await importAssets(
    runtime,
    credentials,
    material.bundle,
    restore.importAsset,
  );
  return { vaultId, vaultTitle, missingAssets };
}

/** Stages downloads before creating a vault and reports failures to Settings. */
export class CloudBackupRestore {
  constructor(
    private state: Pick<CloudBackupViewState, "errorMessage">,
    private getDeps: CloudBackupDepsProvider,
  ) {}
  private get deps() {
    return this.getDeps();
  }

  /**
   * Fetches a backup for restore. Returns the material rather than writing it,
   * so the caller decides the destination (FR-006a) after confirming.
   */
  async fetchForRestore(backupId: string, ownerCode: string) {
    if (!this.deps) return null;
    const result = await restoreVaultFromCloudBackup(this.deps.runtime, {
      backupId,
      ownerCode,
    });
    if (!result.ok) {
      this.state.errorMessage = result.error;
      return null;
    }
    return result.value;
  }

  /**
   * Restores a backup into a brand-new vault (FR-006a).
   *
   * The download is staged first and the new vault is only created once the
   * material is in hand, so a failure mid-transfer leaves the user exactly
   * where they were — no half-built vault, and nothing they already had is
   * touched (FR-011). Restoring *into* an existing vault is deliberately not
   * offered here; that path needs its own overwrite confirmation.
   */
  async restoreIntoNewVault(
    backupId: string,
    ownerCode: string,
  ): Promise<{
    vaultId: string;
    vaultTitle: string;
    missingAssets: number;
  } | null> {
    if (!this.deps?.restore) {
      this.state.errorMessage = "Restore is not available in this context.";
      return null;
    }

    const material = await this.fetchForRestore(backupId, ownerCode);
    if (!material) return null;

    try {
      return await restoreCloudBackupIntoNewVault(
        this.deps.runtime,
        this.deps.restore,
        { backupId, ownerCode },
        material,
      );
    } catch (error) {
      this.state.errorMessage =
        error instanceof Error
          ? error.message
          : "The backup could not be restored.";
      return null;
    }
  }
}

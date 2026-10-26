import {
  fetchCloudBackupAsset,
  type CloudBackupRuntime,
  type restoreVaultFromCloudBackup,
} from "@codex/cloud-backup-sync";
import type { CloudBackupDeps } from "./cloud-backup-types";

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

/** Restore collections in order, preserving the vault receiver for each importer. */
async function importCollections(
  restore: RestoreTarget,
  vaultId: string,
  bundle: unknown,
): Promise<void> {
  const collections = [
    ["entities", "importEntities"],
    ["maps", "importMaps"],
    ["canvases", "importCanvases"],
    ["sessionJournals", "importSessionJournals"],
  ] as const;
  for (const [key, method] of collections) {
    const items = listFrom(bundle, key);
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
  const vaultTitle = material.manifest.vaultTitle;
  const vaultId = await restore.createVault(vaultTitle);
  await importCollections(restore, vaultId, material.bundle);
  const missingAssets = await importAssets(
    runtime,
    credentials,
    material.bundle,
    restore.importAsset,
  );
  return { vaultId, vaultTitle, missingAssets };
}

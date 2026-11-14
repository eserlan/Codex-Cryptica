import {
  fetchCloudBackupAsset,
  getLocalCloudBackupRecord,
  type CloudBackupRuntime,
} from "@codex/cloud-backup-sync";
import type { AssetDownload } from "./cloud-backup-types";

/** Fetches one stored file with this vault's credentials; null on any failure. */
export async function createAssetDownloader(
  runtime: CloudBackupRuntime,
  vaultId: string,
): Promise<AssetDownload | null> {
  const record = await getLocalCloudBackupRecord(runtime, vaultId);
  if (!record) return null;
  return async (assetId) => {
    try {
      const asset = await fetchCloudBackupAsset(runtime, record, assetId);
      return asset.ok ? asset.value : null;
    } catch {
      return null;
    }
  };
}

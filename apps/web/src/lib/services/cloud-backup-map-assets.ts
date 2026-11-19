import { sha256Hex } from "@codex/cloud-backup-sync";
import type { CloudBackupWholeItemAsset } from "schema";
import { assetIdForPath, collectAssetPaths } from "./cloud-backup-payload";

/** A stored file's id is its path id plus the start of its SHA-256, so it never changes under that id. */
export const contentAssetId = (path: string, sha256: string): string =>
  `${assetIdForPath(path)}--${sha256.slice(0, 16)}`;

type MapFile = { bytes: Uint8Array; mimeType: string };

/**
 * Builds the step that gets one map's background and fog mask into the backup
 * before the delta that names them. Files the backup already holds are
 * skipped. Answers null when a file cannot be read or sent, which leaves the
 * map out of the delta.
 */
export function createMapAssetPreparer(io: {
  readFile: (path: string) => Promise<MapFile | null>;
  isStored: (assetId: string) => boolean;
  upload: (
    files: { assetId: string; bytes: Uint8Array; mimeType: string }[],
  ) => Promise<boolean>;
  remember: (hashes: Record<string, string>) => void;
}): (map: unknown) => Promise<CloudBackupWholeItemAsset[] | null> {
  return async (map) => {
    const files: (CloudBackupWholeItemAsset & MapFile & { sha: string })[] = [];
    for (const path of collectAssetPaths([], [map])) {
      let file: MapFile | null = null;
      try {
        file = await io.readFile(path);
      } catch {
        // Treated like a missing file below.
      }
      if (!file) return null;
      const sha = await sha256Hex(file.bytes);
      files.push({
        path,
        assetId: contentAssetId(path, sha),
        mimeType: file.mimeType,
        bytes: file.bytes,
        sha,
      });
    }
    const fresh = files.filter((file) => !io.isStored(file.assetId));
    if (fresh.length > 0) {
      if (!(await io.upload(fresh))) return null;
      io.remember(Object.fromEntries(fresh.map((f) => [f.assetId, f.sha])));
    }
    return files.map(({ path, assetId, mimeType }) => ({
      path,
      assetId,
      mimeType,
    }));
  };
}

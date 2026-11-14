import { isLocalAssetPath } from "./cloud-backup-payload";
import { isSafeRestoredAssetPath } from "./cloud-backup-restore-path";

const MAP_MEDIA_PATH = /^maps\/[^/]+\.(png|jpe?g|webp|gif|avif)$/i;

/** A map's background or mask file: one image directly in the vault's `maps/` folder. */
export const isMapMediaPath = (path: unknown): path is string =>
  isSafeRestoredAssetPath(path) && MAP_MEDIA_PATH.test(path);

/** Whether every vault-owned file a map names is map media (external URLs are not files). */
export function hasSafeMapPaths(map: {
  assetPath?: string;
  fogOfWar?: { maskPath?: string };
}): boolean {
  return [map.assetPath, map.fogOfWar?.maskPath].every(
    (path) => !path || !isLocalAssetPath(path) || isMapMediaPath(path),
  );
}

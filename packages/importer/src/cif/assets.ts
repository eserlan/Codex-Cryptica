import type { CifManifest, CifValidationError } from "./package";
import type { ImportWarning } from "../cc/package";
import { CIF_ZIP_ASSET_PREFIX, isSafeCifZipPath, sha256Hex } from "./zip";
import {
  assetUrlNotImportedWarning,
  assetUnsupportedTypeWarning,
} from "./report";

/**
 * Asset-side package validation and resolution for ZIP packages (Phase 2).
 *
 * Integrity failures (declared file missing from the archive, digest
 * mismatch, unsafe path) are package-blocking — a package whose declared
 * integrity doesn't hold is never partially trusted. Capability gaps
 * (url-only assets, non-image media) are per-asset warnings, matching the
 * Phase 1 rule that nothing droppable disappears silently.
 */
export interface ResolvedCifAsset {
  key: string;
  bytes: Uint8Array;
  mediaType: string;
  /** Basename of the archive path, used as the human-facing file name. */
  fileName: string;
  /** Verified content digest (also the storage dedup key downstream). */
  sha256: string;
}

export interface ResolveCifAssetsResult {
  /** Importable assets keyed by their manifest `key`. */
  assets: Map<string, ResolvedCifAsset>;
  warnings: ImportWarning[];
  errors: CifValidationError[];
}

const IMPORTABLE_MEDIA_TYPES = /^image\/(png|jpeg|webp|gif|avif|svg\+xml)$/;

export async function resolveCifAssets(
  manifest: CifManifest,
  files: ReadonlyMap<string, Uint8Array>,
): Promise<ResolveCifAssetsResult> {
  const assets = new Map<string, ResolvedCifAsset>();
  const warnings: ImportWarning[] = [];
  const errors: CifValidationError[] = [];

  for (const asset of manifest.assets) {
    if (asset.path === undefined) {
      warnings.push(assetUrlNotImportedWarning(asset.key));
      continue;
    }

    if (
      !isSafeCifZipPath(asset.path) ||
      !asset.path.startsWith(CIF_ZIP_ASSET_PREFIX)
    ) {
      errors.push({
        code: "asset-unsafe-path",
        message: `The asset "${asset.key}" declares the path "${asset.path}", which isn't a safe path inside the package's assets folder.`,
        recordKey: asset.key,
      });
      continue;
    }

    const bytes = files.get(asset.path);
    if (!bytes) {
      errors.push({
        code: "asset-missing-file",
        message: `The asset "${asset.key}" declares the file "${asset.path}", but that file isn't in the archive.`,
        recordKey: asset.key,
      });
      continue;
    }

    // Schema guarantees sha256 accompanies path, but stay defensive.
    const declared = asset.sha256?.toLowerCase();
    const actual = await sha256Hex(bytes);
    if (!declared || actual !== declared) {
      errors.push({
        code: "asset-checksum-mismatch",
        message: `The file "${asset.path}" doesn't match the digest declared for asset "${asset.key}". The package may be corrupted or tampered with.`,
        recordKey: asset.key,
      });
      continue;
    }

    if (!IMPORTABLE_MEDIA_TYPES.test(asset.mediaType)) {
      warnings.push(assetUnsupportedTypeWarning(asset.key, asset.mediaType));
      continue;
    }

    assets.set(asset.key, {
      key: asset.key,
      bytes,
      mediaType: asset.mediaType,
      fileName: asset.path.slice(asset.path.lastIndexOf("/") + 1),
      sha256: actual,
    });
  }

  return { assets, warnings, errors };
}

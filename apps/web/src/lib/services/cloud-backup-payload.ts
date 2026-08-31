import type { LocalEntity } from "$lib/stores/vault/types";

/**
 * Builds the whole-vault snapshot that Cloud Backup uploads (spec 162).
 *
 * The consent screen promises "entities, labels, notes and media", so this has
 * to actually collect the media — entities alone would restore a vault whose
 * images are all broken, which is a promise the trust contract does not survive.
 *
 * Asset resolution follows `PublishingService`: local paths are turned into
 * blobs through the vault's own image resolver, then base64-encoded for JSON
 * transport. Remote URLs (`http:`, `data:`, `blob:`) are left alone — they are
 * references, not vault-owned files.
 *
 * Pure aside from the injected resolver, so the size accounting and the
 * skip-and-continue behaviour can be tested without a vault.
 */

export interface CloudBackupPayloadDeps {
  /** Resolves a vault-relative path to a fetchable URL, as the vault store does. */
  resolveImageUrl: (path: string) => Promise<string | null | undefined>;
  fetch?: typeof fetch;
}

export interface CloudBackupPayloadResult {
  vaultTitle: string;
  bundle: {
    schemaVersion: number;
    entities: LocalEntity[];
    assetManifest: { assetId: string; path: string; mimeType: string }[];
  };
  assets: { assetId: string; content: string }[];
  /** Paths that could not be read; surfaced so a partial backup is never silent. */
  skippedAssets: string[];
}

/** Vault-owned file, as opposed to an external reference. */
export function isLocalAssetPath(path: string): boolean {
  if (!path) return false;
  return !/^(data:|blob:|https?:)/i.test(path.trim());
}

/** Stable, filesystem-safe id for an asset path. Mirrors PublishingService. */
export function assetIdForPath(path: string): string {
  return path
    .trim()
    .replace(/^(\.\/|\/)/, "")
    .replace(/[^a-zA-Z0-9.-]/g, "_");
}

/** Every distinct local asset path referenced by these entities. */
export function collectAssetPaths(entities: readonly LocalEntity[]): string[] {
  const paths = new Set<string>();
  for (const entity of entities) {
    const image = (entity as { image?: string }).image;
    if (image && isLocalAssetPath(image)) paths.add(image);
  }
  return [...paths];
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  // Chunked: a single spread of a multi-megabyte array blows the call stack.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export async function buildCloudBackupPayload(
  vaultTitle: string,
  // Widened at the boundary: the vault store's entity record is structurally
  // compatible but not nominally identical, and this only reads `image`.
  entities: readonly LocalEntity[] | readonly unknown[],
  deps: CloudBackupPayloadDeps,
): Promise<CloudBackupPayloadResult> {
  const list = entities as readonly LocalEntity[];
  const fetcher = deps.fetch ?? fetch;
  const assets: { assetId: string; content: string }[] = [];
  const assetManifest: { assetId: string; path: string; mimeType: string }[] =
    [];
  const skippedAssets: string[] = [];

  for (const path of collectAssetPaths(list)) {
    try {
      const url = await deps.resolveImageUrl(path);
      if (!url) throw new Error("unresolved");
      const response = await fetcher(url);
      if (!response.ok) throw new Error(`status ${response.status}`);
      const blob = await response.blob();
      const bytes = new Uint8Array(await blob.arrayBuffer());

      const assetId = assetIdForPath(path);
      assets.push({ assetId, content: toBase64(bytes) });
      assetManifest.push({
        assetId,
        path,
        mimeType: blob.type || "application/octet-stream",
      });
    } catch {
      // One unreadable image must not cost the user their whole backup. It is
      // recorded so the caller can say what was left out rather than implying
      // a complete copy.
      skippedAssets.push(path);
    }
  }

  return {
    vaultTitle,
    bundle: {
      schemaVersion: 1,
      entities: list as LocalEntity[],
      assetManifest,
    },
    assets,
    skippedAssets,
  };
}

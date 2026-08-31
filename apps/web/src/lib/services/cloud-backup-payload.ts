import type { LocalEntity } from "$lib/stores/vault/types";

/**
 * Builds the whole-vault snapshot that Cloud Backup uploads (spec 162).
 *
 * The consent screen promises "entities, labels, notes and media", so this has
 * to actually collect the media — entities alone would restore a vault whose
 * images are all broken, which is a promise the trust contract does not survive.
 *
 * Asset resolution follows `PublishingService`, including which fields count as
 * asset sources: an entity's `image` and `thumbnail`, and a map's `assetPath`.
 * Local paths are turned into blobs through the vault's own image resolver and
 * kept as raw bytes for individual upload. Remote URLs (`http:`, `data:`,
 * `blob:`) are left alone — they are references, not vault-owned files.
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
    maps: unknown[];
    canvases: unknown[];
    assetManifest: { assetId: string; path: string; mimeType: string }[];
  };
  /** Raw bytes per file. Uploaded one request each, never inlined in JSON. */
  assets: { assetId: string; bytes: Uint8Array; mimeType: string }[];
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

/**
 * Every distinct local asset path referenced by a vault's content.
 *
 * Three sources, matching `PublishingService`: an entity's `image` and its
 * `thumbnail`, and a map's `assetPath` — a map's background image is a
 * vault-owned file like any other, and omitting it would restore maps with
 * nothing on them.
 */
export function collectAssetPaths(
  entities: readonly LocalEntity[],
  maps: readonly unknown[] = [],
): string[] {
  const paths = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value === "string" && isLocalAssetPath(value)) paths.add(value);
  };
  for (const entity of entities) {
    add((entity as { image?: string }).image);
    add((entity as { thumbnail?: string }).thumbnail);
  }
  for (const map of maps) {
    add((map as { assetPath?: string }).assetPath);
  }
  return [...paths];
}

export async function buildCloudBackupPayload(
  vaultTitle: string,
  // Widened at the boundary: the vault store's entity record is structurally
  // compatible but not nominally identical, and this only reads a few fields.
  entities: readonly LocalEntity[] | readonly unknown[],
  deps: CloudBackupPayloadDeps,
  content: { maps?: readonly unknown[]; canvases?: readonly unknown[] } = {},
): Promise<CloudBackupPayloadResult> {
  const list = entities as readonly LocalEntity[];
  const maps = content.maps ?? [];
  const canvases = content.canvases ?? [];
  const fetcher = deps.fetch ?? fetch;
  const assets: { assetId: string; bytes: Uint8Array; mimeType: string }[] = [];
  const assetManifest: { assetId: string; path: string; mimeType: string }[] =
    [];
  const skippedAssets: string[] = [];

  for (const path of collectAssetPaths(list, maps)) {
    try {
      const url = await deps.resolveImageUrl(path);
      if (!url) throw new Error("unresolved");
      const response = await fetcher(url);
      if (!response.ok) throw new Error(`status ${response.status}`);
      const blob = await response.blob();
      const bytes = new Uint8Array(await blob.arrayBuffer());

      const assetId = assetIdForPath(path);
      const mimeType = blob.type || "application/octet-stream";
      assets.push({ assetId, bytes, mimeType });
      assetManifest.push({ assetId, path, mimeType });
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
      maps: maps as unknown[],
      canvases: canvases as unknown[],
      assetManifest,
    },
    assets,
    skippedAssets,
  };
}

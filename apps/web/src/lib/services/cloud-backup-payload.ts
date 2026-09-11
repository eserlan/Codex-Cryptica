import type { LocalEntity } from "$lib/stores/vault/types";

/**
 * Builds the whole-vault snapshot that Cloud Backup uploads (spec 162).
 *
 * The consent screen promises "entities, labels, notes and media", so this has
 * to actually collect the media — entities alone would restore a vault whose
 * images are all broken, which is a promise the trust contract does not survive.
 *
 * Asset resolution follows `PublishingService`, extended with the fog-of-war
 * mask: an entity's `image` and `thumbnail`, a map's `assetPath`, and a map's
 * `fogOfWar.maskPath`.
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
  /**
   * Loads an entity's full markdown body. Required for a faithful backup:
   * without it the snapshot stores whatever `content` happens to be in memory,
   * which for a warm start is a 280-character preview, not the lore.
   */
  hydrateEntities?: EntityHydrator;
}

/**
 * The vault's on-demand content loader, narrowed to what a backup needs.
 *
 * `vault.entities[id].content` is only the real markdown once the entity has
 * been hydrated; before that a warm start seeds it from the IndexedDB cache
 * with `contentPreview` — whitespace-collapsed and cut at 280 characters. A
 * snapshot of the live map therefore captures full lore for whatever the user
 * happened to open this session and a stub for everything else.
 */
export interface EntityHydrator {
  isContentLoaded: (id: string) => boolean;
  loadEntityContent: (id: string) => Promise<void>;
  /** Reads the entity back after loading; the store replaces rather than mutates. */
  getEntity: (id: string) => LocalEntity | undefined;
}

/** Entity loads in flight at once. Bounded so a large vault cannot stampede OPFS. */
const HYDRATION_CONCURRENCY = 8;

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
  /** Entities whose body could not be hydrated, for the same reason. */
  skippedEntities: string[];
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
 * Four sources: an entity's `image` and its `thumbnail`, a map's `assetPath`,
 * and a map's `fogOfWar.maskPath`. All four are vault-owned files rather than
 * external references — the map registry deletes the mask alongside the
 * background when a map is removed, which is what makes it vault-owned rather
 * than derived. Omitting the background restores maps with nothing on them;
 * omitting the mask restores them with every hidden area revealed, which is
 * worse than losing the map, because it silently exposes what a GM chose to
 * keep from their players.
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
    add((map as { fogOfWar?: { maskPath?: string } }).fogOfWar?.maskPath);
  }
  return [...paths];
}

/**
 * Replaces every entity in the list with its fully-hydrated self.
 *
 * Entities the vault has already loaded pass through untouched. The rest are
 * loaded through the vault's own deduplicating loader, bounded so a 5k-entity
 * vault does not open five thousand OPFS reads at once. An entity that cannot
 * be read keeps whatever it had and is reported, matching the asset contract:
 * a partial backup is allowed, a silently partial one is not.
 */
export async function hydrateEntityContent(
  entities: readonly LocalEntity[],
  hydrator: EntityHydrator,
  concurrency = HYDRATION_CONCURRENCY,
): Promise<{ entities: LocalEntity[]; skippedEntities: string[] }> {
  const hydrated = [...entities];
  const skippedEntities: string[] = [];
  const pending = hydrated
    .map((entity, index) => ({ entity, index }))
    .filter(({ entity }) => entity?.id && !hydrator.isContentLoaded(entity.id));

  let cursor = 0;
  const worker = async () => {
    while (cursor < pending.length) {
      const { entity, index } = pending[cursor++];
      try {
        await hydrator.loadEntityContent(entity.id);
        // The store swaps the record rather than mutating it, so the loaded
        // body is only visible by reading the entity back.
        hydrated[index] = hydrator.getEntity(entity.id) ?? entity;
      } catch {
        skippedEntities.push(entity.id);
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, pending.length) }, worker),
  );

  return { entities: hydrated, skippedEntities };
}

export async function buildCloudBackupPayload(
  vaultTitle: string,
  // Widened at the boundary: the vault store's entity record is structurally
  // compatible but not nominally identical, and this only reads a few fields.
  entities: readonly LocalEntity[] | readonly unknown[],
  deps: CloudBackupPayloadDeps,
  content: { maps?: readonly unknown[]; canvases?: readonly unknown[] } = {},
): Promise<CloudBackupPayloadResult> {
  let list = entities as readonly LocalEntity[];
  const skippedEntities: string[] = [];

  // Before anything else: the snapshot must hold real markdown, not the
  // warm-start preview. Asset collection reads the hydrated list too, since
  // hydration can replace the records it scans.
  if (deps.hydrateEntities) {
    const result = await hydrateEntityContent(list, deps.hydrateEntities);
    list = result.entities;
    skippedEntities.push(...result.skippedEntities);
  }

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
    skippedEntities,
  };
}

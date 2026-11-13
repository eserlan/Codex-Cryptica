import type { ArtworkAsset } from "./catalogue";

export const COLLECTION_LIMIT = 100 * 1024 * 1024;
export interface ArtworkCollectionEntry {
  assetId: string;
  variant: "preview" | "display";
}
export interface ArtworkCollection {
  id: string;
  version: number;
  title: string;
  coverage: string;
  credits: string[];
  entries: ArtworkCollectionEntry[];
  bytes: number;
  digest: string;
}
export type CollectionVariant = ArtworkAsset["variants"]["preview"];

/** Canonical versioned content used when creating and validating a manifest digest. */
export function collectionDigestInput(
  collection: Pick<ArtworkCollection, "version" | "entries">,
): Uint8Array {
  return new TextEncoder().encode(
    JSON.stringify({
      version: collection.version,
      entries: collection.entries.map(({ assetId, variant }) => ({
        assetId,
        variant,
      })),
    }),
  );
}

function isValidCollectionId(id: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) && id.length <= 100;
}

function isValidCollectionVersion(version: number): boolean {
  return Number.isSafeInteger(version) && version >= 1;
}

function hasValidCollectionText(collection: ArtworkCollection): boolean {
  return (
    Boolean(collection.title.trim()) &&
    Boolean(collection.coverage.trim()) &&
    collection.credits.length > 0 &&
    collection.credits.every((credit) => Boolean(credit.trim()))
  );
}

function assertCollectionMetadata(collection: ArtworkCollection): void {
  const checks = [
    isValidCollectionId(collection.id),
    isValidCollectionVersion(collection.version),
    hasValidCollectionText(collection),
    collection.entries.length > 0,
    /^[a-f0-9]{64}$/.test(collection.digest),
  ];
  if (checks.some((ok) => !ok)) {
    throw new Error("Invalid collection metadata");
  }
}

function assertEntryAssetAvailable(
  key: string,
  asset: ArtworkAsset | undefined,
  seenEntries: ReadonlySet<string>,
): ArtworkAsset {
  if (
    seenEntries.has(key) ||
    !asset ||
    asset.withdrawn ||
    asset.review.status !== "approved"
  ) {
    throw new Error("Invalid collection asset");
  }
  return asset;
}

function resolveEntryVariant(
  entry: ArtworkCollectionEntry,
  assets: ReadonlyMap<string, ArtworkAsset>,
  seenEntries: Set<string>,
): CollectionVariant {
  if (entry.variant !== "preview" && entry.variant !== "display") {
    throw new Error("Invalid variant");
  }
  const key = `${entry.assetId}:${entry.variant}`;
  const asset = assertEntryAssetAvailable(
    key,
    assets.get(entry.assetId),
    seenEntries,
  );
  seenEntries.add(key);
  return asset.variants[entry.variant];
}

function collectUniqueVariants(
  entries: readonly ArtworkCollectionEntry[],
  assets: ReadonlyMap<string, ArtworkAsset>,
): CollectionVariant[] {
  const seenEntries = new Set<string>();
  const variants = new Map<string, CollectionVariant>();
  for (const entry of entries) {
    const variant = resolveEntryVariant(entry, assets, seenEntries);
    const existing = variants.get(variant.url);
    if (existing && variantMismatch(existing, variant)) {
      throw new Error("Conflicting collection variant");
    }
    variants.set(variant.url, variant);
  }
  return [...variants.values()];
}

function variantMismatch(a: CollectionVariant, b: CollectionVariant): boolean {
  return (
    a.sha256 !== b.sha256 ||
    a.bytes !== b.bytes ||
    a.width !== b.width ||
    a.height !== b.height
  );
}

/** Validate catalogue membership and compute unique-byte download requirements. */
export async function validateCollection(
  collection: ArtworkCollection,
  catalogue: readonly ArtworkAsset[],
  cachedUrls: ReadonlySet<string>,
  sha256: (bytes: Uint8Array) => Promise<string>,
): Promise<{
  variants: CollectionVariant[];
  missing: CollectionVariant[];
  totalBytes: number;
  missingBytes: number;
}> {
  assertCollectionMetadata(collection);
  const assets = new Map(catalogue.map((asset) => [asset.id, asset]));
  if (assets.size !== catalogue.length)
    throw new Error("Duplicate catalogue assets");
  const all = collectUniqueVariants(collection.entries, assets);
  const totalBytes = all.reduce((sum, item) => sum + item.bytes, 0);
  if (
    !Number.isSafeInteger(totalBytes) ||
    totalBytes !== collection.bytes ||
    totalBytes > COLLECTION_LIMIT
  )
    throw new Error("Invalid collection size");
  if ((await sha256(collectionDigestInput(collection))) !== collection.digest)
    throw new Error("Invalid collection digest");
  const missing = all.filter((item) => !cachedUrls.has(item.url));
  return {
    variants: all,
    missing,
    totalBytes,
    missingBytes: missing.reduce((sum, item) => sum + item.bytes, 0),
  };
}

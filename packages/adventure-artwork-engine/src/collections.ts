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

function assertCollectionMetadata(collection: ArtworkCollection): void {
  const validId =
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(collection.id) &&
    collection.id.length <= 100;
  const validVersion =
    Number.isSafeInteger(collection.version) && collection.version >= 1;
  const validText =
    Boolean(collection.title.trim()) &&
    Boolean(collection.coverage.trim()) &&
    collection.credits.length > 0 &&
    collection.credits.every((credit) => Boolean(credit.trim()));
  const validDigest = /^[a-f0-9]{64}$/.test(collection.digest);
  if (
    !validId ||
    !validVersion ||
    !validText ||
    !collection.entries.length ||
    !validDigest
  ) {
    throw new Error("Invalid collection metadata");
  }
}

function collectUniqueVariants(
  entries: readonly ArtworkCollectionEntry[],
  assets: ReadonlyMap<string, ArtworkAsset>,
): CollectionVariant[] {
  const seenEntries = new Set<string>();
  const variants = new Map<string, CollectionVariant>();
  for (const entry of entries) {
    if (entry.variant !== "preview" && entry.variant !== "display")
      throw new Error("Invalid variant");
    const key = `${entry.assetId}:${entry.variant}`;
    const asset = assets.get(entry.assetId);
    if (
      seenEntries.has(key) ||
      !asset ||
      asset.withdrawn ||
      asset.review.status !== "approved"
    ) {
      throw new Error("Invalid collection asset");
    }
    seenEntries.add(key);
    const variant = asset.variants[entry.variant];
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

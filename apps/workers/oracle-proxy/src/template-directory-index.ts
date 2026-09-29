import {
  EntityTemplateIndexSchema,
  type EntityTemplateIndex,
  type EntityTemplateListing,
} from "../../../../packages/schema/src/entity-template-listing";
import { readJson } from "./template-directory-shared";

/**
 * One compact object holding a summary of every active entity listing, so a
 * browse request costs a single R2 read regardless of how many listings exist
 * (one read per listing would exceed the Worker subrequest limit at scale).
 *
 * The index holds no template text, token or hash. It is upserted on every
 * state change and can be rebuilt by the operator endpoint.
 */
export const ENTITY_INDEX_KEY = "templates/index/entity.json";

const MAX_ATTEMPTS = 5;

interface IndexEnv {
  BUCKET?: any;
}

export interface EntityIndexRead {
  entries: EntityTemplateIndex["entries"];
  /** Present when an index object exists (even a corrupted one). */
  etag?: string;
  /** False when the stored object could not be parsed. */
  valid: boolean;
}

/** Drops everything but the card fields; only active listings are indexable. */
export function toIndexEntry(
  listing: EntityTemplateListing,
): EntityTemplateIndex["entries"][number] | null {
  if (listing.status !== "active") return null;
  const {
    schemaVersion,
    templateKind,
    listingId,
    title,
    description,
    entityType,
    labels,
    ownerDisplayName,
    packageVersion,
    listingCreatedAt,
    listingUpdatedAt,
  } = listing;
  return {
    schemaVersion,
    templateKind,
    listingId,
    title,
    description,
    entityType,
    labels,
    ...(ownerDisplayName ? { ownerDisplayName } : {}),
    packageVersion,
    status: "active",
    listingCreatedAt,
    listingUpdatedAt,
  };
}

function newestFirst(
  a: { listingUpdatedAt: string },
  b: { listingUpdatedAt: string },
) {
  return b.listingUpdatedAt.localeCompare(a.listingUpdatedAt);
}

/** Never writes. A missing or unreadable index reads as empty. */
export async function readEntityIndex(env: IndexEnv): Promise<EntityIndexRead> {
  const object = await env.BUCKET?.get(ENTITY_INDEX_KEY);
  if (!object) return { entries: [], valid: true };
  try {
    const parsed = EntityTemplateIndexSchema.safeParse(await readJson(object));
    if (parsed.success) {
      return { entries: parsed.data.entries, etag: object.etag, valid: true };
    }
  } catch {
    // fall through to the corrupted result
  }
  return { entries: [], etag: object.etag, valid: false };
}

async function mutate(
  env: IndexEnv,
  change: (entries: EntityIndexRead["entries"]) => EntityIndexRead["entries"],
): Promise<void> {
  if (!env.BUCKET) throw new Error("R2 bucket is not configured");
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const current = await readEntityIndex(env);
    const next: EntityTemplateIndex = {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      entries: change(current.entries).sort(newestFirst),
    };
    const written = await env.BUCKET.put(
      ENTITY_INDEX_KEY,
      JSON.stringify(next),
      {
        httpMetadata: { contentType: "application/json" },
        // Only replace the version we read; create-only when there was none.
        onlyIf: current.etag
          ? { etagMatches: current.etag }
          : { etagDoesNotMatch: "*" },
      },
    );
    if (written !== null) return;
  }
  throw new Error("Could not update the template index. Please try again.");
}

/** Adds or replaces a listing's entry. A non-active listing is removed. */
export async function upsertEntityIndexEntry(
  env: IndexEnv,
  listing: EntityTemplateListing,
): Promise<void> {
  const entry = toIndexEntry(listing);
  await mutate(env, (entries) => {
    const rest = entries.filter((e) => e.listingId !== listing.listingId);
    return entry ? [...rest, entry] : rest;
  });
}

/** Adds or replaces many entries at once (used by batched rebuilds). */
export async function mergeEntityIndexEntries(
  env: IndexEnv,
  entries: EntityIndexRead["entries"],
): Promise<void> {
  if (entries.length === 0) return;
  const ids = new Set(entries.map((e) => e.listingId));
  await mutate(env, (current) => [
    ...current.filter((e) => !ids.has(e.listingId)),
    ...entries,
  ]);
}

/** Removes a listing's entry. A no-op when it is not indexed. */
export async function removeEntityIndexEntry(
  env: IndexEnv,
  listingId: string,
): Promise<void> {
  const current = await readEntityIndex(env);
  if (
    current.valid &&
    !current.entries.some((e) => e.listingId === listingId)
  ) {
    return;
  }
  await mutate(env, (entries) =>
    entries.filter((e) => e.listingId !== listingId),
  );
}

/** Replaces the whole index (used by the operator rebuild). */
export async function writeEntityIndex(
  env: IndexEnv,
  entries: EntityIndexRead["entries"],
): Promise<void> {
  if (!env.BUCKET) throw new Error("R2 bucket is not configured");
  const next: EntityTemplateIndex = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    entries: [...entries].sort(newestFirst),
  };
  await env.BUCKET.put(ENTITY_INDEX_KEY, JSON.stringify(next), {
    httpMetadata: { contentType: "application/json" },
  });
}

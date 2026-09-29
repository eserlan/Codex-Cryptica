import {
  EntityTemplateDetailSchema,
  EntityTemplateDirectoryPageSchema,
  EntityTemplateDirectoryQuerySchema,
  EntityTemplateListingSchema,
  type EntityTemplateDirectoryQuery,
  type EntityTemplateListing,
} from "../../../../packages/schema/src/entity-template-listing";
import { toPublicEntityPackage } from "../../../../packages/schema/src/entity-template-public";
import { readSuspensionMarker } from "./suspension";
import {
  mergeEntityIndexEntries,
  readEntityIndex,
  toIndexEntry,
  writeEntityIndex,
} from "./template-directory-index";
import {
  CACHE_CONTROL,
  PREFIX,
  bucketMissing,
  fail,
  getTemplateListingKey,
  getTemplatePackageKey,
  json,
  operatorAuthError,
  readJson,
  type TemplateDirectoryEnv,
} from "./template-directory-shared";

export type EntityTemplateEnv = TemplateDirectoryEnv;

/** The stored record, or null when it is missing or unreadable. */
async function readRaw(
  env: EntityTemplateEnv,
  listingId: string,
): Promise<unknown | null> {
  const object = await env.BUCKET?.get(getTemplateListingKey(listingId));
  if (!object) return null;
  try {
    return await readJson(object);
  } catch {
    return null;
  }
}

function isEntityRecord(raw: unknown): boolean {
  return (
    typeof raw === "object" &&
    raw !== null &&
    (raw as { templateKind?: unknown }).templateKind === "entity"
  );
}

/**
 * Reads an entity listing record. `undefined` means "not an entity listing"
 * (missing, unreadable, or a stat sheet record) so the caller can fall through
 * to the stat sheet handlers; `null` means an entity listing that is not
 * valid.
 */
export async function readEntityListing(
  env: EntityTemplateEnv,
  listingId: string,
): Promise<EntityTemplateListing | null | undefined> {
  const raw = await readRaw(env, listingId);
  if (!isEntityRecord(raw)) return undefined;
  const parsed = EntityTemplateListingSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** True when the listing is public: active and not removed by the operator. */
async function isVisible(
  env: EntityTemplateEnv,
  listing: EntityTemplateListing,
): Promise<boolean> {
  if (listing.status !== "active") return false;
  return !(await readSuspensionMarker(env, listing.listingId));
}

type Visible =
  | { state: "other" }
  | { state: "hidden" }
  | { state: "visible"; listing: EntityTemplateListing };

/** Where a listing id stands for a public reader. */
async function publicListing(
  env: EntityTemplateEnv,
  listingId: string,
): Promise<Visible> {
  const listing = await readEntityListing(env, listingId);
  if (listing === undefined) return { state: "other" };
  if (!listing || !(await isVisible(env, listing))) return { state: "hidden" };
  return { state: "visible", listing };
}

async function readPublicPackage(env: EntityTemplateEnv, listingId: string) {
  const object = await env.BUCKET?.get(getTemplatePackageKey(listingId));
  if (!object) return { kind: "missing" as const };
  try {
    const result = toPublicEntityPackage(await readJson(object));
    return result.ok
      ? { kind: "ok" as const, package: result.package }
      : { kind: "invalid" as const };
  } catch {
    return { kind: "invalid" as const };
  }
}

const notFound = (request: Request) =>
  fail(request, "Template listing not found", 404);

/** Returns `null` when the id is not an entity listing (fall through). */
export async function handleGetEntityTemplateListing(
  request: Request,
  env: EntityTemplateEnv,
  listingId: string,
): Promise<Response | null> {
  const found = await publicListing(env, listingId);
  if (found.state === "other") return null;
  if (found.state === "hidden") return notFound(request);
  const pkg = await readPublicPackage(env, listingId);
  if (pkg.kind !== "ok") return notFound(request);
  return json(
    request,
    EntityTemplateDetailSchema.parse({
      ...found.listing,
      previewMarkdown: pkg.package.template.markdown,
    }),
    200,
    { "Cache-Control": CACHE_CONTROL },
  );
}

/** Returns `null` when the id is not an entity listing (fall through). */
export async function handleGetEntityTemplatePackage(
  request: Request,
  env: EntityTemplateEnv,
  listingId: string,
): Promise<Response | null> {
  const found = await publicListing(env, listingId);
  if (found.state === "other") return null;
  const missing = () => fail(request, "Template package not found", 404);
  if (found.state === "hidden") return missing();
  const pkg = await readPublicPackage(env, listingId);
  if (pkg.kind === "missing") return missing();
  if (pkg.kind === "invalid") {
    return fail(request, "This template could not be read.", 422);
  }
  return json(request, pkg.package, 200, { "Cache-Control": CACHE_CONTROL });
}

function parseListQuery(url: URL) {
  const params = url.searchParams;
  return EntityTemplateDirectoryQuerySchema.safeParse({
    kind: params.get("kind") ?? undefined,
    q: params.get("q") || undefined,
    entityType: params.get("entityType") || undefined,
    labels: params.get("labels")?.split(",").filter(Boolean),
    cursor: params.get("cursor") || undefined,
    limit: params.has("limit") ? Number(params.get("limit")) : undefined,
  });
}

const haystack = (entry: EntityTemplateListing) =>
  [entry.title, entry.description, entry.entityType, ...entry.labels]
    .join(" ")
    .toLowerCase();

const hasLabel = (entry: EntityTemplateListing, label: string) =>
  entry.labels.some((x) => x.toLowerCase() === label);

/** Search text and labels narrow the list; the type filter is applied after. */
function narrow(
  entries: EntityTemplateListing[],
  query: EntityTemplateDirectoryQuery,
) {
  const needle = query.q?.toLowerCase();
  const labels = query.labels?.map((l) => l.toLowerCase()) ?? [];
  return entries.filter(
    (e) =>
      (!needle || haystack(e).includes(needle)) &&
      labels.every((l) => hasLabel(e, l)),
  );
}

/** Type counts for the filter. They ignore the type filter so it can be changed. */
function typeFacets(entries: EntityTemplateListing[]) {
  const counts = new Map<string, number>();
  for (const e of entries) {
    const type = e.entityType.toLowerCase();
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return {
    entityTypes: [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)),
  };
}

export async function handleListEntityTemplateListings(
  request: Request,
  env: EntityTemplateEnv,
): Promise<Response> {
  if (!env.BUCKET) return bucketMissing(request);
  const parsed = parseListQuery(new URL(request.url));
  if (!parsed.success) return fail(request, "Invalid directory query", 400);
  const query = parsed.data;

  const { entries } = await readEntityIndex(env);
  const narrowed = narrow(entries, query);
  const type = query.entityType?.toLowerCase();
  const filtered = type
    ? narrowed.filter((e) => e.entityType.toLowerCase() === type)
    : narrowed;

  const start = query.cursor ? Number(query.cursor) || 0 : 0;
  const end = start + query.limit;
  return json(
    request,
    EntityTemplateDirectoryPageSchema.parse({
      results: filtered.slice(start, end),
      nextCursor: end < filtered.length ? String(end) : undefined,
      facets: typeFacets(narrowed),
    }),
    200,
    { "Cache-Control": CACHE_CONTROL },
  );
}

function parseRebuildParams(url: URL) {
  const requested = Number(url.searchParams.get("limit") ?? 200);
  const valid = Number.isInteger(requested) && requested > 0;
  return {
    limit: valid ? Math.min(requested, 500) : 200,
    cursor: url.searchParams.get("cursor") || undefined,
  };
}

/** The index entries for the public listings among a batch of stored objects. */
async function visibleEntries(
  env: EntityTemplateEnv,
  objects: { key: string }[],
) {
  const entries = [];
  for (const object of objects) {
    if (!object.key.endsWith("/listing.json")) continue;
    const listingId = object.key.slice(PREFIX.length).split("/")[0];
    const listing = await readEntityListing(env, listingId);
    if (!listing || !(await isVisible(env, listing))) continue;
    const entry = toIndexEntry(listing);
    if (entry) entries.push(entry);
  }
  return entries;
}

/**
 * Operator repair for the summary index. Scans listings in bounded batches:
 * the first call (no cursor) starts a fresh index, later calls merge into it.
 */
export async function handleRebuildEntityTemplateIndex(
  request: Request,
  env: EntityTemplateEnv,
): Promise<Response> {
  if (!env.BUCKET) return bucketMissing(request);
  const denied = operatorAuthError(request, env);
  if (denied) return denied;

  const { limit, cursor } = parseRebuildParams(new URL(request.url));
  const page = await env.BUCKET.list({
    prefix: PREFIX,
    limit,
    ...(cursor ? { cursor } : {}),
  });
  const entries = await visibleEntries(env, page.objects);

  if (cursor) await mergeEntityIndexEntries(env, entries);
  else await writeEntityIndex(env, entries);

  return json(request, {
    processed: entries.length,
    ...(page.truncated && page.cursor ? { nextCursor: page.cursor } : {}),
  });
}

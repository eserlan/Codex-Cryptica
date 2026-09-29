import {
  EntityTemplateListingSchema,
  type EntityTemplateListing,
} from "../../../../packages/schema/src/entity-template-listing";
import {
  normalizeEntityTemplateLabels,
  toPublicEntityPackage,
  validateEntityTemplatePublishMetadata,
  type PublicEntityTemplatePackage,
} from "../../../../packages/schema/src/entity-template-public";
import { readEntityListing } from "./entity-template-directory";
import { readSuspensionMarker } from "./suspension";
import {
  removeEntityIndexEntry,
  upsertEntityIndexEntry,
} from "./template-directory-index";
import {
  CACHE_CONTROL,
  authorize,
  bucketMissing,
  fail,
  getTemplateListingKey,
  getTemplatePackageKey,
  hashOwnerToken,
  json,
  readJson,
  type TemplateDirectoryEnv,
} from "./template-directory-shared";

type Env = TemplateDirectoryEnv;

const removedByOperator = (request: Request) =>
  fail(
    request,
    "This listing was removed by the operator and can't be restored.",
    403,
    "removed_by_operator",
  );

const httpMetadata = {
  contentType: "application/json",
  cacheControl: CACHE_CONTROL,
};

/** True when a publish body carries an entity template package. */
export async function isEntityPublishRequest(
  request: Request,
): Promise<boolean> {
  try {
    const body = (await request.clone().json()) as {
      package?: { kind?: unknown };
    };
    return body?.package?.kind === "entity-template";
  } catch {
    return false;
  }
}

interface Parsed {
  package: PublicEntityTemplatePackage;
  description: string;
  labels: string[];
  ownerDisplayName?: string;
  rightsAcknowledged: boolean;
}

type RawMetadata = {
  description?: unknown;
  labels?: unknown;
  ownerDisplayName?: unknown;
  rightsAcknowledged?: unknown;
};

type ParseResult = { ok: true; value: Parsed } | { ok: false; message: string };

/** The listing details from a publish body, checked against the shared limits. */
function parseMetadata(
  meta: RawMetadata,
):
  | { ok: true; value: Omit<Parsed, "package"> }
  | { ok: false; message: string } {
  const description =
    typeof meta.description === "string" ? meta.description : "";
  const labels = Array.isArray(meta.labels)
    ? meta.labels.filter((l): l is string => typeof l === "string")
    : [];
  const name =
    typeof meta.ownerDisplayName === "string"
      ? meta.ownerDisplayName.trim()
      : "";
  const ownerDisplayName = name || undefined;
  const issues = validateEntityTemplatePublishMetadata({
    description,
    labels,
    ownerDisplayName,
  });
  if (issues.length) return { ok: false, message: issues[0].message };
  return {
    ok: true,
    value: {
      description: description.trim(),
      labels: normalizeEntityTemplateLabels(labels),
      ownerDisplayName,
      rightsAcknowledged: meta.rightsAcknowledged === true,
    },
  };
}

async function parseBody(request: Request): Promise<ParseResult> {
  const body = (await request.json().catch(() => undefined)) as
    { package?: unknown; metadata?: RawMetadata } | undefined;
  if (!body) return { ok: false, message: "That request could not be read." };
  const pkg = toPublicEntityPackage(body.package);
  if (!pkg.ok) return { ok: false, message: pkg.error };
  const meta = parseMetadata(body.metadata ?? {});
  if (!meta.ok) return meta;
  return { ok: true, value: { package: pkg.package, ...meta.value } };
}

function buildListing(
  parsed: Parsed,
  base: {
    listingId: string;
    createdAt: string;
    updatedAt: string;
    status: "active" | "unpublished";
  },
): EntityTemplateListing {
  return EntityTemplateListingSchema.parse({
    schemaVersion: 1,
    templateKind: "entity",
    listingId: base.listingId,
    title: parsed.package.template.name,
    description: parsed.description,
    entityType: parsed.package.template.entityType,
    labels: parsed.labels,
    ...(parsed.ownerDisplayName
      ? { ownerDisplayName: parsed.ownerDisplayName }
      : {}),
    packageVersion: parsed.package.formatVersion,
    status: base.status,
    listingCreatedAt: base.createdAt,
    listingUpdatedAt: base.updatedAt,
  });
}

async function writeObjects(
  env: Env,
  listing: EntityTemplateListing,
  pkg: PublicEntityTemplatePackage | null,
  ownerTokenHash: string,
) {
  if (pkg) {
    await env.BUCKET.put(
      getTemplatePackageKey(listing.listingId),
      JSON.stringify(pkg),
      {
        httpMetadata,
      },
    );
  }
  await env.BUCKET.put(
    getTemplateListingKey(listing.listingId),
    JSON.stringify(listing),
    {
      httpMetadata,
      customMetadata: { ownerTokenHash },
    },
  );
}

export async function handleCreateEntityTemplateListing(
  request: Request,
  env: Env,
): Promise<Response> {
  if (!env.BUCKET) return bucketMissing(request);
  const parsed = await parseBody(request);
  if (!parsed.ok) return fail(request, parsed.message, 400, "validation");
  if (!parsed.value.rightsAcknowledged) {
    return fail(
      request,
      "Confirm that you're happy for this template to be public.",
      400,
      "validation",
    );
  }

  const now = new Date().toISOString();
  const listing = buildListing(parsed.value, {
    listingId: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: "active",
  });
  const token = crypto.randomUUID();

  await writeObjects(
    env,
    listing,
    parsed.value.package,
    await hashOwnerToken(token),
  );
  try {
    await upsertEntityIndexEntry(env, listing);
  } catch {
    // Roll back so a listing never exists that browse cannot show.
    await env.BUCKET.delete(getTemplateListingKey(listing.listingId));
    await env.BUCKET.delete(getTemplatePackageKey(listing.listingId));
    return fail(request, "Could not publish right now. Please try again.", 503);
  }
  return json(request, { listing, ownerToken: token }, 201);
}

/**
 * Shared gate for owner actions. Returns `undefined` when the id is not an
 * entity listing (fall through), a Response to send, or the listing and the
 * hash of its owner token when the caller may proceed.
 */
async function gate(
  request: Request,
  env: Env,
  listingId: string,
): Promise<
  | undefined
  | Response
  | { listing: EntityTemplateListing; ownerTokenHash: string }
> {
  const listing = await readEntityListing(env, listingId);
  if (listing === undefined) return undefined;
  if (listing === null) return fail(request, "Template listing not found", 404);

  const authError = await authorize(request, env, listingId);
  if (authError) return authError;
  if (await readSuspensionMarker(env, listingId))
    return removedByOperator(request);

  const head = await env.BUCKET.head(getTemplateListingKey(listingId));
  return {
    listing,
    ownerTokenHash: head?.customMetadata?.ownerTokenHash ?? "",
  };
}

async function tryRemoveFromIndex(env: Env, listingId: string) {
  try {
    await removeEntityIndexEntry(env, listingId);
    return true;
  } catch {
    return false;
  }
}

const indexBusy = (request: Request) =>
  fail(
    request,
    "Could not update the directory right now. Please try again.",
    503,
  );

type Owner = { listing: EntityTemplateListing; ownerTokenHash: string };

/**
 * Runs an owner action once the caller is proven to own the listing. Returns
 * `null` when the id is not an entity listing so the caller can fall through.
 */
async function asOwner(
  request: Request,
  env: Env,
  listingId: string,
  act: (owner: Owner) => Promise<Response>,
): Promise<Response | null> {
  if (!env.BUCKET) return bucketMissing(request);
  const allowed = await gate(request, env, listingId);
  if (allowed === undefined) return null;
  if (allowed instanceof Response) return allowed;
  return act(allowed);
}

/** `null` when the id is not an entity listing. */
export function handleUpdateEntityTemplateListing(
  request: Request,
  env: Env,
  listingId: string,
): Promise<Response | null> {
  return asOwner(request, env, listingId, (allowed) =>
    updateListing(request, env, listingId, allowed),
  );
}

async function updateListing(
  request: Request,
  env: Env,
  listingId: string,
  allowed: Owner,
): Promise<Response> {
  const parsed = await parseBody(request);
  if (!parsed.ok) return fail(request, parsed.message, 400, "validation");
  const listing = buildListing(parsed.value, {
    listingId,
    createdAt: allowed.listing.listingCreatedAt,
    updatedAt: new Date().toISOString(),
    status: "active",
  });
  await writeObjects(
    env,
    listing,
    parsed.value.package,
    allowed.ownerTokenHash,
  );
  try {
    await upsertEntityIndexEntry(env, listing);
  } catch {
    return fail(request, "Could not update right now. Please try again.", 503);
  }
  return json(request, listing);
}

/** `null` when the id is not an entity listing. */
export function handleUnpublishEntityTemplateListing(
  request: Request,
  env: Env,
  listingId: string,
): Promise<Response | null> {
  return asOwner(request, env, listingId, async (owner) => {
    if (owner.listing.status !== "unpublished") {
      const hidden = {
        ...owner.listing,
        status: "unpublished" as const,
        listingUpdatedAt: new Date().toISOString(),
      };
      await writeObjects(env, hidden, null, owner.ownerTokenHash);
    }
    // The listing is already hidden; if the index cannot be updated the owner
    // retries, which converges because this action is idempotent.
    return (await tryRemoveFromIndex(env, listingId))
      ? json(request, { success: true })
      : indexBusy(request);
  });
}

/** `null` when the id is not an entity listing. */
export function handleDeleteEntityTemplateListing(
  request: Request,
  env: Env,
  listingId: string,
): Promise<Response | null> {
  return asOwner(request, env, listingId, async () => {
    // Index first: if the objects then fail to delete, the listing is at least
    // no longer shown, and the owner can retry the delete.
    if (!(await tryRemoveFromIndex(env, listingId))) return indexBusy(request);
    await env.BUCKET.delete(getTemplateListingKey(listingId));
    await env.BUCKET.delete(getTemplatePackageKey(listingId));
    return json(request, { success: true });
  });
}

/** Owner read: the listing and package, even while unpublished. */
export function handleEntityTemplateOwner(
  request: Request,
  env: Env,
  listingId: string,
): Promise<Response | null> {
  return asOwner(request, env, listingId, async (owner) => {
    const object = await env.BUCKET.get(getTemplatePackageKey(listingId));
    const result = object
      ? toPublicEntityPackage(await readJson(object))
      : null;
    if (!result || !result.ok) {
      return fail(request, "Template package not found", 404);
    }
    return json(request, { listing: owner.listing, package: result.package });
  });
}

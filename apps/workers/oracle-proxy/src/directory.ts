import {
  DirectoryPageSchema,
  DirectoryQuerySchema,
  DirectoryResultSchema,
  ListingDraftSchema,
  PublicListingSchema,
  GuestBundleSchema,
  type DirectoryQuery,
  type ListingDraft,
  type PublicListing,
} from "../../../../packages/schema/src/publishing";
import { getCorsHeaders, getWriteToken } from "./publish";
import { upsertNoticeSidecar } from "./notice";
import { readSuspensionMarker } from "./suspension";

interface DirectoryEnv {
  BUCKET?: any; // R2Bucket
  ALLOWED_ORIGINS?: string;
  ALLOW_CLOUDFLARE_PAGES_PREVIEW_ORIGINS?: string;
}

const DIRECTORY_PREFIX = "directory/listings/";
const DIRECTORY_CACHE_CONTROL = "public, max-age=15";

export function getListingObjectKey(publishId: string): string {
  return `${DIRECTORY_PREFIX}${publishId}.json`;
}

export function getGuestUrl(publishId: string): string {
  return `/guest/${publishId}`;
}

export function getDirectoryCacheControl(): string {
  return DIRECTORY_CACHE_CONTROL;
}

function getCoverImageUrl(
  request: Request,
  publishId: string,
  assetId: string,
) {
  return new URL(
    `/api/published/${publishId}/assets/${assetId}`,
    request.url,
  ).toString();
}

export function projectDirectoryResult(
  request: Request,
  listing: PublicListing,
) {
  const result = DirectoryResultSchema.parse({
    publishId: listing.publishId,
    guestUrl: listing.guestUrl,
    title: listing.title,
    description: listing.description,
    labels: listing.labels,
    coverImageUrl: listing.coverImageAssetId
      ? getCoverImageUrl(request, listing.publishId, listing.coverImageAssetId)
      : undefined,
    coverImageAlt: listing.coverImageAlt,
    ownerDisplayName: listing.ownerDisplayName,
    visibleEntityCount: listing.visibleEntityCount,
    listingUpdatedAt: listing.listingUpdatedAt,
  });
  return result;
}

async function readPublishedBundle(env: DirectoryEnv, publishId: string) {
  const bundleKey = `published/${publishId}/bundle.json`;
  const bundleResponse = await env.BUCKET?.get(bundleKey);
  if (!bundleResponse) return null;

  const text =
    typeof bundleResponse.text === "function"
      ? await bundleResponse.text()
      : new TextDecoder().decode(bundleResponse.body);
  const raw = JSON.parse(text);
  const parsed = GuestBundleSchema.safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data;
}

export async function authorizeListingMutation(
  request: Request,
  env: DirectoryEnv,
  publishId: string,
) {
  const clientToken = getWriteToken(request);
  if (!clientToken) {
    return new Response(
      JSON.stringify({ error: { message: "Unauthorized: Missing token" } }),
      {
        status: 401,
        headers: {
          ...getCorsHeaders(request.headers, env),
          "Content-Type": "application/json",
        },
      },
    );
  }

  const bundleHead = await env.BUCKET?.head(
    `published/${publishId}/bundle.json`,
  );
  if (!bundleHead) {
    return new Response(
      JSON.stringify({ error: { message: "Snapshot not found" } }),
      {
        status: 404,
        headers: {
          ...getCorsHeaders(request.headers, env),
          "Content-Type": "application/json",
        },
      },
    );
  }

  const serverToken = bundleHead.customMetadata?.writeToken;
  if (!serverToken || serverToken !== clientToken) {
    return new Response(
      JSON.stringify({ error: { message: "Unauthorized listing mutation" } }),
      {
        status: 401,
        headers: {
          ...getCorsHeaders(request.headers, env),
          "Content-Type": "application/json",
        },
      },
    );
  }

  return null;
}

async function loadListing(env: DirectoryEnv, publishId: string) {
  const listingObject = await env.BUCKET?.get(getListingObjectKey(publishId));
  if (!listingObject) return null;
  const text =
    typeof listingObject.text === "function"
      ? await listingObject.text()
      : new TextDecoder().decode(listingObject.body);
  const raw = JSON.parse(text);
  const parsed = PublicListingSchema.safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data;
}

function buildListing(
  bundle: any,
  draft: ListingDraft,
  now: string,
  existing?: PublicListing,
) {
  return PublicListingSchema.parse({
    schemaVersion: 1,
    publishId: draft.publishId,
    guestUrl: getGuestUrl(draft.publishId),
    title: draft.title,
    description: draft.description,
    labels: draft.labels,
    coverImageAssetId: draft.coverImageAssetId,
    coverImageAlt: draft.coverImageAlt,
    ownerDisplayName: draft.ownerDisplayName,
    visibleEntityCount: bundle.entities.length,
    snapshotPublishedAt: bundle.publishedAt,
    listingCreatedAt: existing?.listingCreatedAt ?? now,
    listingUpdatedAt: now,
    rightsAcknowledgedAt: existing?.rightsAcknowledgedAt ?? now,
    fanContent: draft.fanContent ?? false,
  });
}

function parseDirectoryQuery(url: URL): DirectoryQuery {
  const labelsParam = url.searchParams.get("labels");
  return DirectoryQuerySchema.parse({
    q: url.searchParams.get("q") ?? undefined,
    labels: labelsParam
      ? labelsParam
          .split(",")
          .map((label) => label.trim())
          .filter(Boolean)
      : undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.has("limit")
      ? Number(url.searchParams.get("limit"))
      : undefined,
  });
}

export async function handleGetPublicListing(
  request: Request,
  env: DirectoryEnv,
  publishId: string,
): Promise<Response> {
  const cors = getCorsHeaders(request.headers, env);
  if (!env.BUCKET) {
    return new Response("Internal Server Error", {
      status: 500,
      headers: cors,
    });
  }

  const suspension = await readSuspensionMarker(env, publishId);
  if (suspension) {
    return new Response(
      JSON.stringify({ error: { message: "Listing not found" } }),
      {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  }

  const listing = await loadListing(env, publishId);
  if (!listing) {
    return new Response(
      JSON.stringify({ error: { message: "Listing not found" } }),
      {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  }

  const bundleHead = await env.BUCKET.head(
    `published/${publishId}/bundle.json`,
  );
  if (!bundleHead) {
    await env.BUCKET.delete(getListingObjectKey(publishId));
    return new Response(
      JSON.stringify({ error: { message: "Listing not found" } }),
      {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  }

  return new Response(JSON.stringify(listing), {
    status: 200,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "Cache-Control": getDirectoryCacheControl(),
    },
  });
}

export async function handlePutPublicListing(
  request: Request,
  env: DirectoryEnv,
  publishId: string,
): Promise<Response> {
  const cors = getCorsHeaders(request.headers, env);
  if (!env.BUCKET) {
    return new Response("Internal Server Error", {
      status: 500,
      headers: cors,
    });
  }

  const authError = await authorizeListingMutation(request, env, publishId);
  if (authError) return authError;

  let draft: ListingDraft;
  try {
    const body = await request.json();
    draft = ListingDraftSchema.parse({
      ...body,
      publishId,
    });
  } catch (err: any) {
    console.error(
      "[directory] Zod or parse error in handlePutPublicListing:",
      err,
    );
    return new Response(
      JSON.stringify({
        error: {
          message: "Invalid listing metadata",
          details: err?.message || String(err),
        },
      }),
      {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  }

  const bundle = await readPublishedBundle(env, publishId);
  if (!bundle) {
    return new Response(
      JSON.stringify({ error: { message: "Snapshot not found" } }),
      {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  }

  const matchingAsset = draft.coverImageAssetId
    ? bundle.assetManifest.find(
        (asset) =>
          asset.assetId === draft.coverImageAssetId ||
          asset.filename === draft.coverImageAssetId,
      )
    : undefined;

  let isValidCover = !!matchingAsset;
  if (draft.coverImageAssetId && !isValidCover) {
    const assetKey = `published/${publishId}/assets/${draft.coverImageAssetId}`;
    const headResult = await env.BUCKET.head(assetKey);
    if (headResult) {
      isValidCover = true;
    }
  }

  if (draft.coverImageAssetId && !isValidCover) {
    console.error(
      "[directory] Cover image validation failed for coverImageAssetId:",
      draft.coverImageAssetId,
      "matchingAsset:",
      matchingAsset,
    );
    return new Response(
      JSON.stringify({
        error: { message: "Cover image must come from the published snapshot" },
      }),
      {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  }

  if (matchingAsset) {
    draft.coverImageAssetId = matchingAsset.assetId;
  }

  const existing = await loadListing(env, publishId);
  const listing = buildListing(
    bundle,
    draft,
    new Date().toISOString(),
    existing ?? undefined,
  );

  await env.BUCKET.put(
    getListingObjectKey(publishId),
    JSON.stringify(listing),
    {
      contentType: "application/json",
    },
  );

  await upsertNoticeSidecar(env, publishId, {
    fanContent: draft.fanContent ?? false,
    fanContentDisclaimer: draft.fanContentDisclaimer,
    rightsAcknowledgedAt: listing.rightsAcknowledgedAt,
    updatedAt: listing.listingUpdatedAt,
  });

  return new Response(JSON.stringify(listing), {
    status: 200,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "Cache-Control": getDirectoryCacheControl(),
    },
  });
}

export async function handleDeletePublicListing(
  request: Request,
  env: DirectoryEnv,
  publishId: string,
): Promise<Response> {
  const cors = getCorsHeaders(request.headers, env);
  if (!env.BUCKET) {
    return new Response("Internal Server Error", {
      status: 500,
      headers: cors,
    });
  }

  const authError = await authorizeListingMutation(request, env, publishId);
  if (authError) return authError;

  await env.BUCKET.delete(getListingObjectKey(publishId));
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export async function handleListPublicListings(
  request: Request,
  env: DirectoryEnv,
): Promise<Response> {
  const cors = getCorsHeaders(request.headers, env);
  if (!env.BUCKET) {
    return new Response("Internal Server Error", {
      status: 500,
      headers: cors,
    });
  }

  let query: DirectoryQuery;
  try {
    query = parseDirectoryQuery(new URL(request.url));
  } catch {
    return new Response(
      JSON.stringify({ error: { message: "Invalid query" } }),
      {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  }

  const listed = await env.BUCKET.list({ prefix: DIRECTORY_PREFIX });

  const listingPromises = listed.objects.map(async (object) => {
    const publishId = object.key
      .slice(DIRECTORY_PREFIX.length)
      .replace(/\.json$/, "");
    const suspension = await readSuspensionMarker(env, publishId);
    if (suspension) return null;
    const listing = await loadListing(env, publishId);
    if (!listing) return null;

    const bundleHead = await env.BUCKET.head(
      `published/${publishId}/bundle.json`,
    );
    if (!bundleHead) {
      await env.BUCKET.delete(getListingObjectKey(publishId));
      return null;
    }

    return listing;
  });

  const resolvedListings = await Promise.all(listingPromises);
  const listings = resolvedListings.filter(
    (l): l is PublicListing => l !== null,
  );

  const needle = query.q?.toLowerCase();
  const filtered = listings
    .filter((listing) => {
      if (needle) {
        const haystack =
          `${listing.title} ${listing.description}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      if (query.labels?.length) {
        const listingLabels = new Set(
          listing.labels.map((label) => label.toLowerCase()),
        );
        for (const label of query.labels) {
          if (!listingLabels.has(label.toLowerCase())) return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      const byUpdated = b.listingUpdatedAt.localeCompare(a.listingUpdatedAt);
      if (byUpdated !== 0) return byUpdated;
      return a.publishId.localeCompare(b.publishId);
    });

  const start = query.cursor ? Number(query.cursor) : 0;
  const pageItems = filtered.slice(start, start + query.limit);
  const nextCursor =
    start + query.limit < filtered.length
      ? String(start + query.limit)
      : undefined;

  const responseBody = DirectoryPageSchema.parse({
    results: pageItems.map((listing) =>
      projectDirectoryResult(request, listing),
    ),
    nextCursor,
  });

  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "Cache-Control": getDirectoryCacheControl(),
    },
  });
}

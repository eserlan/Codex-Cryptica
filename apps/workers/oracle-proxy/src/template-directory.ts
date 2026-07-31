import {
  CommunityTemplateListingSchema,
  PublicTemplatePackageSchema,
  TemplateDirectoryPageSchema,
  TemplateDirectoryQuerySchema,
  type CommunityTemplateListing,
  type PublicTemplatePackage,
} from "../../../../packages/schema/src/publishing";
import { SuspensionMarkerSchema } from "../../../../packages/schema/src/publishing";
import { readSuspensionMarker, writeSuspensionMarker } from "./suspension";

interface TemplateDirectoryEnv {
  BUCKET?: any;
  ALLOWED_ORIGINS?: string;
  ALLOW_CLOUDFLARE_PAGES_PREVIEW_ORIGINS?: string;
  TURNSTILE_SECRET_KEY?: string;
  TEMPLATE_ADMIN_TOKEN?: string;
}

const PREFIX = "templates/listings/";
const CACHE_CONTROL = "public, max-age=15";

export function getTemplateListingKey(listingId: string): string {
  return `${PREFIX}${listingId}/listing.json`;
}

export function getTemplatePackageKey(listingId: string): string {
  return `${PREFIX}${listingId}/package.json`;
}

function cors(request: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
}

function json(
  request: Request,
  body: unknown,
  status = 200,
  extra: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(request), "Content-Type": "application/json", ...extra },
  });
}

async function readJson(object: any): Promise<unknown> {
  const text =
    typeof object?.text === "function"
      ? await object.text()
      : new TextDecoder().decode(object?.body);
  return JSON.parse(text);
}

async function readListing(
  env: TemplateDirectoryEnv,
  listingId: string,
): Promise<CommunityTemplateListing | null> {
  if (await readSuspensionMarker(env, listingId)) return null;
  return readListingRecord(env, listingId);
}

async function readListingRecord(
  env: TemplateDirectoryEnv,
  listingId: string,
): Promise<CommunityTemplateListing | null> {
  const object = await env.BUCKET?.get(getTemplateListingKey(listingId));
  if (!object) return null;
  try {
    const parsed = CommunityTemplateListingSchema.safeParse(
      await readJson(object),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function readPackage(
  env: TemplateDirectoryEnv,
  listingId: string,
): Promise<PublicTemplatePackage | null> {
  const object = await env.BUCKET?.get(getTemplatePackageKey(listingId));
  if (!object) return null;
  try {
    const parsed = PublicTemplatePackageSchema.safeParse(
      await readJson(object),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function ownerToken(request: Request): string | null {
  const value = request.headers.get("Authorization");
  return value?.startsWith("Bearer ")
    ? value.slice(7).trim()
    : value?.trim() || null;
}

async function authorize(
  request: Request,
  env: TemplateDirectoryEnv,
  listingId: string,
) {
  const token = ownerToken(request);
  if (!token)
    return json(request, { error: { message: "Owner token required" } }, 401);
  const head = await env.BUCKET?.head(getTemplateListingKey(listingId));
  if (!head)
    return json(
      request,
      { error: { message: "Template listing not found" } },
      404,
    );
  if (head.customMetadata?.ownerToken !== token) {
    return json(request, { error: { message: "Invalid owner token" } }, 401);
  }
  return null;
}

function projectResult(
  listing: CommunityTemplateListing,
  pkg: PublicTemplatePackage,
) {
  return TemplateDirectoryPageSchema.shape.results.element.parse({
    ...listing,
    fieldPreview: pkg.template.fields,
  });
}

export async function handleCreateTemplateListing(
  request: Request,
  env: TemplateDirectoryEnv,
): Promise<Response> {
  if (!env.BUCKET)
    return json(
      request,
      { error: { message: "R2 bucket is not configured" } },
      500,
    );
  try {
    const body = (await request.json()) as {
      package?: unknown;
      metadata?: Record<string, unknown>;
    };
    const pkg = PublicTemplatePackageSchema.parse(body.package);
    const now = new Date().toISOString();
    const listingId = crypto.randomUUID();
    const token = crypto.randomUUID();
    const metadata = body.metadata ?? {};
    if (metadata.rightsAcknowledged !== true) {
      return json(
        request,
        { error: { message: "Public sharing acknowledgment is required" } },
        400,
      );
    }
    const listing = CommunityTemplateListingSchema.parse({
      schemaVersion: 1,
      listingId,
      title: pkg.template.name,
      description: pkg.template.description,
      system: pkg.template.system,
      category: pkg.template.category,
      labels: pkg.template.labels,
      ownerDisplayName: metadata.ownerDisplayName,
      packageVersion: pkg.schemaVersion,
      listingCreatedAt: now,
      listingUpdatedAt: now,
      importCount: 0,
    });
    await env.BUCKET.put(
      getTemplateListingKey(listingId),
      JSON.stringify(listing),
      {
        httpMetadata: {
          contentType: "application/json",
          cacheControl: CACHE_CONTROL,
        },
        customMetadata: { ownerToken: token },
      },
    );
    await env.BUCKET.put(
      getTemplatePackageKey(listingId),
      JSON.stringify({ ...pkg, publishedAt: now }),
      {
        httpMetadata: {
          contentType: "application/json",
          cacheControl: CACHE_CONTROL,
        },
      },
    );
    return json(request, { listing, ownerToken: token }, 201);
  } catch (error) {
    return json(
      request,
      {
        error: {
          message: "Invalid template package or metadata",
          details: String(error),
        },
      },
      400,
    );
  }
}

export async function handleGetTemplateListing(
  request: Request,
  env: TemplateDirectoryEnv,
  listingId: string,
): Promise<Response> {
  const listing = await readListing(env, listingId);
  const pkg = await readPackage(env, listingId);
  if (!listing || !pkg)
    return json(
      request,
      { error: { message: "Template listing not found" } },
      404,
    );
  return json(request, projectResult(listing, pkg), 200, {
    "Cache-Control": CACHE_CONTROL,
  });
}

export async function handleGetTemplatePackage(
  request: Request,
  env: TemplateDirectoryEnv,
  listingId: string,
): Promise<Response> {
  if (await readSuspensionMarker(env, listingId))
    return json(
      request,
      { error: { message: "Template package not found" } },
      404,
    );
  const pkg = await readPackage(env, listingId);
  if (!pkg)
    return json(
      request,
      { error: { message: "Template package not found" } },
      404,
    );
  return json(request, pkg, 200, { "Cache-Control": CACHE_CONTROL });
}

export async function handleUpdateTemplateListing(
  request: Request,
  env: TemplateDirectoryEnv,
  listingId: string,
): Promise<Response> {
  if (!env.BUCKET)
    return json(
      request,
      { error: { message: "R2 bucket is not configured" } },
      500,
    );
  const authError = await authorize(request, env, listingId);
  if (authError) return authError;
  try {
    const body = (await request.json()) as {
      package?: unknown;
      metadata?: Record<string, unknown>;
    };
    const pkg = PublicTemplatePackageSchema.parse(body.package);
    const existing = await readListingRecord(env, listingId);
    if (!existing)
      return json(
        request,
        { error: { message: "Template listing not found" } },
        404,
      );
    const listing = CommunityTemplateListingSchema.parse({
      ...existing,
      title: pkg.template.name,
      description: pkg.template.description,
      system: pkg.template.system,
      category: pkg.template.category,
      labels: pkg.template.labels,
      ownerDisplayName:
        body.metadata?.ownerDisplayName ?? existing.ownerDisplayName,
      packageVersion: pkg.schemaVersion,
      listingUpdatedAt: new Date().toISOString(),
    });
    await env.BUCKET.put(
      getTemplateListingKey(listingId),
      JSON.stringify(listing),
      {
        httpMetadata: {
          contentType: "application/json",
          cacheControl: CACHE_CONTROL,
        },
      },
    );
    await env.BUCKET.put(
      getTemplatePackageKey(listingId),
      JSON.stringify({ ...pkg, publishedAt: new Date().toISOString() }),
      {
        httpMetadata: {
          contentType: "application/json",
          cacheControl: CACHE_CONTROL,
        },
      },
    );
    return json(request, listing);
  } catch (error) {
    return json(
      request,
      {
        error: {
          message: "Invalid template package or metadata",
          details: String(error),
        },
      },
      400,
    );
  }
}

export async function handleDeleteTemplateListing(
  request: Request,
  env: TemplateDirectoryEnv,
  listingId: string,
): Promise<Response> {
  if (!env.BUCKET)
    return json(
      request,
      { error: { message: "R2 bucket is not configured" } },
      500,
    );
  const authError = await authorize(request, env, listingId);
  if (authError && authError.status !== 404) return authError;
  await env.BUCKET.delete(getTemplateListingKey(listingId));
  await env.BUCKET.delete(getTemplatePackageKey(listingId));
  return json(request, { success: true });
}

export async function handleReportTemplateListing(
  request: Request,
  env: TemplateDirectoryEnv,
  listingId: string,
): Promise<Response> {
  if (!env.BUCKET)
    return json(
      request,
      { error: { message: "R2 bucket is not configured" } },
      500,
    );
  if (!(await readListing(env, listingId)))
    return json(
      request,
      { error: { message: "Template listing not found" } },
      404,
    );
  try {
    const body = (await request.json()) as {
      reason?: string;
      details?: string;
      reporterContact?: string;
    };
    if (!body.reason?.trim())
      return json(
        request,
        { error: { message: "A report reason is required" } },
        400,
      );
    const reportId = crypto.randomUUID();
    await env.BUCKET.put(
      `moderation/template-reports/${reportId}.json`,
      JSON.stringify({
        schemaVersion: 1,
        reportId,
        listingId,
        reason: body.reason.trim().slice(0, 300),
        details: body.details?.trim().slice(0, 2_000),
        reporterContact: body.reporterContact?.trim().slice(0, 300),
        receivedAt: new Date().toISOString(),
      }),
      { httpMetadata: { contentType: "application/json" } },
    );
    return json(request, { success: true }, 201);
  } catch {
    return json(
      request,
      { error: { message: "Invalid template report" } },
      400,
    );
  }
}

export async function handleListTemplateListings(
  request: Request,
  env: TemplateDirectoryEnv,
): Promise<Response> {
  if (!env.BUCKET)
    return json(
      request,
      { error: { message: "R2 bucket is not configured" } },
      500,
    );
  let query;
  try {
    const url = new URL(request.url);
    query = TemplateDirectoryQuerySchema.parse({
      q: url.searchParams.get("q") || undefined,
      system: url.searchParams.get("system") || undefined,
      category: url.searchParams.get("category") || undefined,
      labels: url.searchParams.get("labels")?.split(",").filter(Boolean),
      cursor: url.searchParams.get("cursor") || undefined,
      limit: url.searchParams.has("limit")
        ? Number(url.searchParams.get("limit"))
        : undefined,
    });
  } catch {
    return json(
      request,
      { error: { message: "Invalid directory query" } },
      400,
    );
  }
  const objects: any[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.BUCKET.list({
      prefix: PREFIX,
      ...(cursor ? { cursor } : {}),
    });
    objects.push(...page.objects);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  const records = await Promise.all(
    objects
      .filter((object: any) => object.key.endsWith("/listing.json"))
      .map(async (object: any) => {
        const listingId = object.key.slice(PREFIX.length).split("/")[0];
        const listing = await readListing(env, listingId);
        const pkg = await readPackage(env, listingId);
        return listing && pkg ? projectResult(listing, pkg) : null;
      }),
  );
  const needle = query.q?.toLowerCase();
  const filtered = records
    .filter((record): record is ReturnType<typeof projectResult> =>
      Boolean(record),
    )
    .filter((record) => {
      const haystack = [
        record.title,
        record.description,
        record.system,
        record.category,
        ...record.labels,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (
        query.system &&
        record.system?.toLowerCase() !== query.system.toLowerCase()
      )
        return false;
      if (query.category && record.category !== query.category) return false;
      if (query.labels?.some((label) => !record.labels.includes(label)))
        return false;
      return true;
    })
    .sort((a, b) => b.listingUpdatedAt.localeCompare(a.listingUpdatedAt));
  const start = query.cursor ? Number(query.cursor) || 0 : 0;
  const results = filtered.slice(start, start + query.limit);
  const nextCursor =
    start + query.limit < filtered.length
      ? String(start + query.limit)
      : undefined;
  return json(request, { results, nextCursor }, 200, {
    "Cache-Control": CACHE_CONTROL,
  });
}

export async function handleAdminSuspendTemplateListing(
  request: Request,
  env: TemplateDirectoryEnv,
): Promise<Response> {
  if (!env.BUCKET)
    return json(
      request,
      { error: { message: "R2 bucket is not configured" } },
      500,
    );
  const expected = env.TEMPLATE_ADMIN_TOKEN;
  const supplied = ownerToken(request);
  if (!expected || !supplied || supplied !== expected) {
    return json(
      request,
      { error: { message: "Operator authorization required" } },
      401,
    );
  }
  try {
    const body = (await request.json()) as {
      publishId?: unknown;
      mode?: unknown;
      reason?: unknown;
    };
    const marker = SuspensionMarkerSchema.parse({
      schemaVersion: 1,
      publishId: body.publishId,
      mode: body.mode,
      reason: body.reason,
      createdAt: new Date().toISOString(),
    });
    await writeSuspensionMarker(env, marker);
    return json(request, { success: true }, 201);
  } catch {
    return json(
      request,
      { error: { message: "Invalid suspension marker" } },
      400,
    );
  }
}

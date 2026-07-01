import {
  GuestBundleSchema,
  PUBLISH_LIMITS,
} from "../../../../packages/schema/src/publishing";

interface PublishEnv {
  BUCKET?: any; // R2Bucket
  ALLOWED_ORIGINS?: string;
  ALLOW_CLOUDFLARE_PAGES_PREVIEW_ORIGINS?: string;
  TURNSTILE_SECRET_KEY?: string;
}

const ALLOWED_ASSET_TYPES = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

class PayloadTooLargeError extends Error {}

async function readTextWithLimit(
  request: Request,
  maxBytes: number,
): Promise<string> {
  const declaredLength = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new PayloadTooLargeError();
  }
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new PayloadTooLargeError();
    }
    chunks.push(value);
  }
  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

async function verifyTurnstile(
  request: Request,
  env: PublishEnv,
): Promise<boolean> {
  const token = request.headers.get("X-Turnstile-Token");

  // Dev-only bypass: the secret is never configured in local wrangler dev
  // unless explicitly added to .dev.vars. Origin headers are client-controlled
  // and must not gate this.
  if (!env.TURNSTILE_SECRET_KEY) {
    return token === "dev-turnstile-token";
  }

  if (!token || token.length > 2_048) return false;

  const form = new FormData();
  form.set("secret", env.TURNSTILE_SECRET_KEY);
  form.set("response", token);
  form.set("remoteip", request.headers.get("CF-Connecting-IP") || "");

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: form,
      },
    );
    if (!response.ok) return false;
    const result = (await response.json()) as {
      success?: boolean;
      hostname?: string;
      action?: string;
    };
    return (
      result.success === true &&
      result.action === "publish_snapshot" &&
      isCodexHostname(result.hostname)
    );
  } catch {
    return false;
  }
}

function isCodexHostname(hostname: string | undefined): boolean {
  return (
    hostname === "codexcryptica.com" ||
    hostname === "codex-cryptica.com" ||
    hostname === "staging.codexcryptica.com" ||
    hostname === "staging.codex-cryptica.com" ||
    hostname?.endsWith(".codex-cryptica.pages.dev") === true
  );
}

function detectAssetType(body: Uint8Array): string | null {
  if (
    body.length >= 8 &&
    body[0] === 0x89 &&
    body[1] === 0x50 &&
    body[2] === 0x4e &&
    body[3] === 0x47 &&
    body[4] === 0x0d &&
    body[5] === 0x0a &&
    body[6] === 0x1a &&
    body[7] === 0x0a
  )
    return "image/png";
  if (
    body.length >= 3 &&
    body[0] === 0xff &&
    body[1] === 0xd8 &&
    body[2] === 0xff
  )
    return "image/jpeg";
  if (
    body.length >= 12 &&
    new TextDecoder().decode(body.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(body.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  if (
    body.length >= 12 &&
    new TextDecoder().decode(body.slice(4, 8)) === "ftyp" &&
    ["avif", "avis"].includes(new TextDecoder().decode(body.slice(8, 12)))
  )
    return "image/avif";
  return null;
}

function hasValidAssetId(assetId: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(assetId);
}

async function getAssetUsage(
  bucket: any,
  publishId: string,
): Promise<{ count: number; bytes: number }> {
  const prefix = `published/${publishId}/assets/`;
  let cursor: string | undefined;
  let count = 0;
  let bytes = 0;
  do {
    const listed = await bucket.list({ prefix, cursor });
    for (const object of listed.objects) {
      count++;
      bytes += typeof object.size === "number" ? object.size : 0;
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
  return { count, bytes };
}

/**
 * Extract token from authorization header
 */
export function getWriteToken(request: Request): string | null {
  const auth = request.headers.get("Authorization");
  if (!auth) return null;
  if (auth.startsWith("Bearer ")) {
    return auth.substring(7).trim();
  }
  return auth.trim();
}

/**
 * Get CORS headers
 */
export function getCorsHeaders(
  requestHeaders: Headers,
  _env: PublishEnv,
): Record<string, string> {
  const origin = requestHeaders.get("Origin") || "";
  // We can import isOriginAllowed or inline/reuse it. Since we will run within index.ts,
  // we can expect index.ts to handle CORS, or we can add headers here.
  // To keep it simple, we just mirror the origin if it matches allowed patterns.
  // In index.ts, there is isOriginAllowed. We can import it or write a simple CORS helper.
  // Let's assume index.ts imports us, and we return Responses. CORS can be appended at the index.ts level.
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With, X-Turnstile-Token, X-Filename",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
}

/**
 * Handle POST /api/publish-vault
 */
export async function handlePublishVault(
  request: Request,
  env: PublishEnv,
): Promise<Response> {
  const cors = getCorsHeaders(request.headers, env);
  if (!env.BUCKET) {
    return new Response(
      JSON.stringify({
        error: { message: "R2 Bucket binding is not configured" },
      }),
      {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const url = new URL(request.url);
    const queryPublishId = url.searchParams.get("publishId");
    const clientToken = getWriteToken(request);

    let bodyText: string;
    try {
      bodyText = await readTextWithLimit(
        request,
        PUBLISH_LIMITS.maxBundleBytes,
      );
    } catch (error) {
      if (error instanceof PayloadTooLargeError) {
        return new Response(
          JSON.stringify({
            error: {
              message:
                "Payload too large. Maximum size for JSON bundle is 10MB.",
            },
          }),
          {
            status: 413,
            headers: { ...cors, "Content-Type": "application/json" },
          },
        );
      }
      throw error;
    }
    if (!bodyText) {
      return new Response(
        JSON.stringify({ error: { message: "A JSON bundle is required." } }),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    let bundle: any;
    try {
      bundle = JSON.parse(bodyText);
    } catch {
      return new Response(
        JSON.stringify({ error: { message: "Invalid JSON format" } }),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    let publishId = queryPublishId;
    let writeToken = clientToken;
    let isUpdate = false;

    if (publishId) {
      // It's an update. We MUST authorize.
      const key = `published/${publishId}/bundle.json`;
      const existing = await env.BUCKET.head(key);

      if (!existing) {
        return new Response(
          JSON.stringify({ error: { message: "Snapshot not found" } }),
          {
            status: 404,
            headers: { ...cors, "Content-Type": "application/json" },
          },
        );
      }

      const serverToken = existing.customMetadata?.writeToken;
      if (!serverToken || serverToken !== writeToken) {
        return new Response(
          JSON.stringify({ error: { message: "Unauthorized update" } }),
          {
            status: 401,
            headers: { ...cors, "Content-Type": "application/json" },
          },
        );
      }
      isUpdate = true;
    } else {
      if (!(await verifyTurnstile(request, env))) {
        return new Response(
          JSON.stringify({
            error: { message: "Verification required to publish a snapshot" },
          }),
          {
            status: 403,
            headers: { ...cors, "Content-Type": "application/json" },
          },
        );
      }
      // It's a new publish. Generate ID and Token.
      publishId = crypto.randomUUID();
      writeToken = crypto.randomUUID();
    }

    // Update bundle structure with generated values if necessary
    bundle.publishId = publishId;
    const publishedAt = new Date().toISOString();
    bundle.publishedAt = publishedAt;

    const validation = GuestBundleSchema.safeParse(bundle);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: { message: "Invalid published snapshot" } }),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }
    bundle = validation.data;
    if (
      bundle.assetManifest.some(
        (asset) => !ALLOWED_ASSET_TYPES.has(asset.mimeType),
      )
    ) {
      return new Response(
        JSON.stringify({
          error: { message: "Snapshot contains an unsupported asset type" },
        }),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    const key = `published/${publishId}/bundle.json`;
    const entityCount = Array.isArray(bundle.entities)
      ? bundle.entities.length
      : 0;
    const relationshipCount = Array.isArray(bundle.relationships)
      ? bundle.relationships.length
      : 0;
    const assetCount = Array.isArray(bundle.assetManifest)
      ? bundle.assetManifest.length
      : 0;

    // Save to R2
    await env.BUCKET.put(key, JSON.stringify(bundle), {
      contentType: "application/json",
      customMetadata: {
        writeToken: writeToken!,
        vaultTitle: bundle.vaultTitle || "Untitled World",
        publishedAt,
        entityCount: String(entityCount),
        relationshipCount: String(relationshipCount),
        assetCount: String(assetCount),
      },
    });

    return new Response(
      JSON.stringify({
        publishId,
        writeToken,
        publishedAt,
        isUpdate,
      }),
      {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: { message: err.message || "Failed to publish" },
      }),
      {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * Handle GET /api/published/:publishId/bundle
 */
export async function handleGetBundle(
  request: Request,
  env: PublishEnv,
  publishId: string,
): Promise<Response> {
  const cors = getCorsHeaders(request.headers, env);
  if (!env.BUCKET) {
    return new Response("Internal Server Error", {
      status: 500,
      headers: cors,
    });
  }

  const key = `published/${publishId}/bundle.json`;
  const obj = await env.BUCKET.get(key);

  if (!obj) {
    return new Response(
      JSON.stringify({ error: { message: "Snapshot not found" } }),
      {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Cache-Control", "public, max-age=60"); // Short cache for dynamic data bundle
  for (const [k, v] of Object.entries(cors)) {
    headers.set(k, v);
  }

  return new Response(obj.body, {
    status: 200,
    headers,
  });
}

/**
 * Handle GET /api/published/:publishId/manifest
 */
export async function handleGetManifest(
  request: Request,
  env: PublishEnv,
  publishId: string,
): Promise<Response> {
  const cors = getCorsHeaders(request.headers, env);
  if (!env.BUCKET) {
    return new Response("Internal Server Error", {
      status: 500,
      headers: cors,
    });
  }

  const key = `published/${publishId}/bundle.json`;
  const obj = await env.BUCKET.head(key);

  if (!obj) {
    return new Response(
      JSON.stringify({ error: { message: "Snapshot not found" } }),
      {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  }

  const metadata = obj.customMetadata || {};
  const manifest = {
    publishId,
    vaultTitle: metadata.vaultTitle || "Untitled World",
    publishedAt: metadata.publishedAt || "",
    entityCount: parseInt(metadata.entityCount || "0", 10),
    relationshipCount: parseInt(metadata.relationshipCount || "0", 10),
    assetCount: parseInt(metadata.assetCount || "0", 10),
  };

  return new Response(JSON.stringify(manifest), {
    status: 200,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300", // Cache manifest longer
    },
  });
}

/**
 * Handle POST /api/published/:publishId/assets/:assetId
 */
export async function handleUploadAsset(
  request: Request,
  env: PublishEnv,
  publishId: string,
  assetId: string,
): Promise<Response> {
  const cors = getCorsHeaders(request.headers, env);
  if (!env.BUCKET) {
    return new Response("Internal Server Error", {
      status: 500,
      headers: cors,
    });
  }

  try {
    const clientToken = getWriteToken(request);
    if (!clientToken) {
      return new Response(
        JSON.stringify({ error: { message: "Unauthorized: Missing token" } }),
        {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    // Verify token against bundle metadata
    const bundleKey = `published/${publishId}/bundle.json`;
    const bundleObj = await env.BUCKET.head(bundleKey);

    if (!bundleObj) {
      return new Response(
        JSON.stringify({ error: { message: "Bundle snapshot not found" } }),
        {
          status: 404,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    const serverToken = bundleObj.customMetadata?.writeToken;
    if (!serverToken || serverToken !== clientToken) {
      return new Response(
        JSON.stringify({ error: { message: "Unauthorized asset upload" } }),
        {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    if (!hasValidAssetId(assetId)) {
      return new Response(
        JSON.stringify({ error: { message: "Invalid asset identifier" } }),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    // Parse payload and enforce size limit.
    const contentType =
      request.headers.get("Content-Type")?.split(";", 1)[0].toLowerCase() || "";
    if (!ALLOWED_ASSET_TYPES.has(contentType)) {
      return new Response(
        JSON.stringify({ error: { message: "Unsupported asset type" } }),
        {
          status: 415,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }
    const bodyBuffer = await request.arrayBuffer();

    if (bodyBuffer.byteLength > PUBLISH_LIMITS.maxAssetBytes) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Payload too large. Maximum size for an asset is 5MB.",
          },
        }),
        {
          status: 413,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    const detectedType = detectAssetType(new Uint8Array(bodyBuffer));
    if (detectedType !== contentType) {
      return new Response(
        JSON.stringify({
          error: { message: "Asset content does not match its declared type" },
        }),
        {
          status: 415,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    // Upload to R2 under assets path
    const assetKey = `published/${publishId}/assets/${assetId}`;
    const existingAsset = await env.BUCKET.head(assetKey);
    const usage = await getAssetUsage(env.BUCKET, publishId);
    const replacedBytes =
      typeof existingAsset?.size === "number" ? existingAsset.size : 0;
    if (
      (!existingAsset && usage.count >= PUBLISH_LIMITS.maxAssets) ||
      usage.bytes - replacedBytes + bodyBuffer.byteLength >
        PUBLISH_LIMITS.maxSnapshotAssetBytes
    ) {
      return new Response(
        JSON.stringify({ error: { message: "Snapshot asset quota exceeded" } }),
        {
          status: 413,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }
    await env.BUCKET.put(assetKey, bodyBuffer, {
      contentType: detectedType,
      customMetadata: {
        mimeType: detectedType,
        filename: assetId,
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: { message: err.message || "Failed to upload asset" },
      }),
      {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * Handle GET /api/published/:publishId/assets/:assetId
 */
export async function handleGetAsset(
  request: Request,
  env: PublishEnv,
  publishId: string,
  assetId: string,
): Promise<Response> {
  const cors = getCorsHeaders(request.headers, env);
  if (!env.BUCKET) {
    return new Response("Internal Server Error", {
      status: 500,
      headers: cors,
    });
  }

  const assetKey = `published/${publishId}/assets/${assetId}`;
  let obj = await env.BUCKET.get(assetKey);

  if (!obj) {
    const fallbackId = assetId.includes(".")
      ? assetId.replace(/\./g, "_")
      : assetId;
    if (fallbackId !== assetId) {
      const fallbackKey = `published/${publishId}/assets/${fallbackId}`;
      obj = await env.BUCKET.get(fallbackKey);
    }
  }

  if (!obj) {
    return new Response(
      JSON.stringify({ error: { message: "Asset not found" } }),
      {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  }

  const headers = new Headers();
  const contentType =
    obj.httpMetadata?.contentType || obj.customMetadata?.mimeType;
  if (!contentType || !ALLOWED_ASSET_TYPES.has(contentType)) {
    return new Response("Unsupported asset type", {
      status: 415,
      headers: cors,
    });
  }
  headers.set("Content-Type", contentType);
  headers.set("Content-Disposition", `inline; filename="${assetId}"`);
  headers.set("X-Content-Type-Options", "nosniff");
  // Set long-term immutable cache control for unique asset hashes
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  for (const [k, v] of Object.entries(cors)) {
    headers.set(k, v);
  }

  return new Response(obj.body, {
    status: 200,
    headers,
  });
}

/**
 * Handle DELETE /api/published/:publishId
 */
export async function handleDeleteVault(
  request: Request,
  env: PublishEnv,
  publishId: string,
): Promise<Response> {
  const cors = getCorsHeaders(request.headers, env);
  if (!env.BUCKET) {
    return new Response("Internal Server Error", {
      status: 500,
      headers: cors,
    });
  }

  try {
    const clientToken = getWriteToken(request);
    if (!clientToken) {
      return new Response(
        JSON.stringify({ error: { message: "Unauthorized: Missing token" } }),
        {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    // Verify token against bundle metadata
    const bundleKey = `published/${publishId}/bundle.json`;
    const bundleObj = await env.BUCKET.head(bundleKey);

    if (!bundleObj) {
      return new Response(
        JSON.stringify({ error: { message: "Snapshot not found" } }),
        {
          status: 404,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    const serverToken = bundleObj.customMetadata?.writeToken;
    if (!serverToken || serverToken !== clientToken) {
      return new Response(
        JSON.stringify({ error: { message: "Unauthorized deletion" } }),
        {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    // Delete the bundle
    await env.BUCKET.delete(bundleKey);

    // List and delete all assets under the directory prefix
    const prefix = `published/${publishId}/`;
    let listed = await env.BUCKET.list({ prefix });

    while (listed.objects.length > 0) {
      for (const obj of listed.objects) {
        await env.BUCKET.delete(obj.key);
      }
      if (listed.truncated) {
        listed = await env.BUCKET.list({ prefix, cursor: listed.cursor });
      } else {
        break;
      }
    }

    await env.BUCKET.delete(`directory/listings/${publishId}.json`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: { message: err.message || "Failed to delete snapshot" },
      }),
      {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * Handle DELETE /api/published/:publishId/assets/:assetId
 */
export async function handleDeleteAsset(
  request: Request,
  env: PublishEnv,
  publishId: string,
  assetId: string,
): Promise<Response> {
  const cors = getCorsHeaders(request.headers, env);
  if (!env.BUCKET) {
    return new Response("Internal Server Error", {
      status: 500,
      headers: cors,
    });
  }

  try {
    const clientToken = getWriteToken(request);
    if (!clientToken) {
      return new Response(
        JSON.stringify({ error: { message: "Unauthorized: Missing token" } }),
        {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    // Verify token against bundle metadata
    const bundleKey = `published/${publishId}/bundle.json`;
    const bundleObj = await env.BUCKET.head(bundleKey);

    if (!bundleObj) {
      return new Response(
        JSON.stringify({ error: { message: "Bundle snapshot not found" } }),
        {
          status: 404,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    const serverToken = bundleObj.customMetadata?.writeToken;
    if (!serverToken || serverToken !== clientToken) {
      return new Response(
        JSON.stringify({ error: { message: "Unauthorized asset deletion" } }),
        {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    const assetKey = `published/${publishId}/assets/${assetId}`;
    await env.BUCKET.delete(assetKey);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: { message: err.message || "Failed to delete asset" },
      }),
      {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  }
}

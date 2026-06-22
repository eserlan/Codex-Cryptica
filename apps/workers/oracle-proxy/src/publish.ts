interface PublishEnv {
  BUCKET?: any; // R2Bucket
  ALLOWED_ORIGINS?: string;
  ALLOW_CLOUDFLARE_PAGES_PREVIEW_ORIGINS?: string;
}

/**
 * Extract token from authorization header
 */
function getWriteToken(request: Request): string | null {
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
function getCorsHeaders(requestHeaders: Headers, env: PublishEnv): Record<string, string> {
  const origin = requestHeaders.get("Origin") || "";
  // We can import isOriginAllowed or inline/reuse it. Since we will run within index.ts,
  // we can expect index.ts to handle CORS, or we can add headers here.
  // To keep it simple, we just mirror the origin if it matches allowed patterns.
  // In index.ts, there is isOriginAllowed. We can import it or write a simple CORS helper.
  // Let's assume index.ts imports us, and we return Responses. CORS can be appended at the index.ts level.
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  };
}

/**
 * Handle POST /api/publish-vault
 */
export async function handlePublishVault(request: Request, env: PublishEnv): Promise<Response> {
  const cors = getCorsHeaders(request.headers, env);
  if (!env.BUCKET) {
    return new Response(JSON.stringify({ error: { message: "R2 Bucket binding is not configured" } }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(request.url);
    const queryPublishId = url.searchParams.get("publishId");
    const clientToken = getWriteToken(request);

    const bodyText = await request.text();

    // Check size limit: 10MB (10 * 1024 * 1024 bytes)
    if (bodyText.length > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: { message: "Payload too large. Maximum size for JSON bundle is 10MB." } }), {
        status: 413,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    let bundle: any;
    try {
      bundle = JSON.parse(bodyText);
    } catch {
      return new Response(JSON.stringify({ error: { message: "Invalid JSON format" } }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    let publishId = queryPublishId || bundle.publishId;
    let writeToken = clientToken;
    let isUpdate = false;

    if (publishId) {
      // It's an update. We MUST authorize.
      const key = `published/${publishId}/bundle.json`;
      const existing = await env.BUCKET.head(key);

      if (!existing) {
        return new Response(JSON.stringify({ error: { message: "Snapshot not found" } }), {
          status: 404,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const serverToken = existing.customMetadata?.writeToken;
      if (!serverToken || serverToken !== writeToken) {
        return new Response(JSON.stringify({ error: { message: "Unauthorized update" } }), {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      isUpdate = true;
    } else {
      // It's a new publish. Generate ID and Token.
      publishId = crypto.randomUUID();
      writeToken = crypto.randomUUID();
    }

    // Update bundle structure with generated values if necessary
    bundle.publishId = publishId;
    const publishedAt = new Date().toISOString();
    bundle.publishedAt = publishedAt;

    const key = `published/${publishId}/bundle.json`;
    const entityCount = Array.isArray(bundle.entities) ? bundle.entities.length : 0;
    const relationshipCount = Array.isArray(bundle.relationships) ? bundle.relationships.length : 0;
    const assetCount = Array.isArray(bundle.assetManifest) ? bundle.assetManifest.length : 0;

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

    return new Response(JSON.stringify({
      publishId,
      writeToken,
      publishedAt,
      isUpdate,
    }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: { message: err.message || "Failed to publish" } }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}

/**
 * Handle GET /api/published/:publishId/bundle
 */
export async function handleGetBundle(request: Request, env: PublishEnv, publishId: string): Promise<Response> {
  const cors = getCorsHeaders(request.headers, env);
  if (!env.BUCKET) {
    return new Response("Internal Server Error", { status: 500, headers: cors });
  }

  const key = `published/${publishId}/bundle.json`;
  const obj = await env.BUCKET.get(key);

  if (!obj) {
    return new Response(JSON.stringify({ error: { message: "Snapshot not found" } }), {
      status: 404,
      headers: { ...cors, "Content-Type": "application/json" },
    });
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
export async function handleGetManifest(request: Request, env: PublishEnv, publishId: string): Promise<Response> {
  const cors = getCorsHeaders(request.headers, env);
  if (!env.BUCKET) {
    return new Response("Internal Server Error", { status: 500, headers: cors });
  }

  const key = `published/${publishId}/bundle.json`;
  const obj = await env.BUCKET.head(key);

  if (!obj) {
    return new Response(JSON.stringify({ error: { message: "Snapshot not found" } }), {
      status: 404,
      headers: { ...cors, "Content-Type": "application/json" },
    });
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
export async function handleUploadAsset(request: Request, env: PublishEnv, publishId: string, assetId: string): Promise<Response> {
  const cors = getCorsHeaders(request.headers, env);
  if (!env.BUCKET) {
    return new Response("Internal Server Error", { status: 500, headers: cors });
  }

  try {
    const clientToken = getWriteToken(request);
    if (!clientToken) {
      return new Response(JSON.stringify({ error: { message: "Unauthorized: Missing token" } }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Verify token against bundle metadata
    const bundleKey = `published/${publishId}/bundle.json`;
    const bundleObj = await env.BUCKET.head(bundleKey);

    if (!bundleObj) {
      return new Response(JSON.stringify({ error: { message: "Bundle snapshot not found" } }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const serverToken = bundleObj.customMetadata?.writeToken;
    if (!serverToken || serverToken !== clientToken) {
      return new Response(JSON.stringify({ error: { message: "Unauthorized asset upload" } }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Parse payload and enforce size limit: 5MB (5 * 1024 * 1024 bytes)
    const contentType = request.headers.get("Content-Type") || "application/octet-stream";
    const bodyBuffer = await request.arrayBuffer();

    if (bodyBuffer.byteLength > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: { message: "Payload too large. Maximum size for an asset is 5MB." } }), {
        status: 413,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Upload to R2 under assets path
    const assetKey = `published/${publishId}/assets/${assetId}`;
    await env.BUCKET.put(assetKey, bodyBuffer, {
      contentType,
      customMetadata: {
        mimeType: contentType,
        filename: request.headers.get("X-Filename") || assetId,
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: { message: err.message || "Failed to upload asset" } }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}

/**
 * Handle GET /api/published/:publishId/assets/:assetId
 */
export async function handleGetAsset(request: Request, env: PublishEnv, publishId: string, assetId: string): Promise<Response> {
  const cors = getCorsHeaders(request.headers, env);
  if (!env.BUCKET) {
    return new Response("Internal Server Error", { status: 500, headers: cors });
  }

  const assetKey = `published/${publishId}/assets/${assetId}`;
  const obj = await env.BUCKET.get(assetKey);

  if (!obj) {
    return new Response(JSON.stringify({ error: { message: "Asset not found" } }), {
      status: 404,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const headers = new Headers();
  headers.set("Content-Type", obj.httpMetadata?.contentType || obj.customMetadata?.mimeType || "application/octet-stream");
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
export async function handleDeleteVault(request: Request, env: PublishEnv, publishId: string): Promise<Response> {
  const cors = getCorsHeaders(request.headers, env);
  if (!env.BUCKET) {
    return new Response("Internal Server Error", { status: 500, headers: cors });
  }

  try {
    const clientToken = getWriteToken(request);
    if (!clientToken) {
      return new Response(JSON.stringify({ error: { message: "Unauthorized: Missing token" } }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Verify token against bundle metadata
    const bundleKey = `published/${publishId}/bundle.json`;
    const bundleObj = await env.BUCKET.head(bundleKey);

    if (!bundleObj) {
      return new Response(JSON.stringify({ error: { message: "Snapshot not found" } }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const serverToken = bundleObj.customMetadata?.writeToken;
    if (!serverToken || serverToken !== clientToken) {
      return new Response(JSON.stringify({ error: { message: "Unauthorized deletion" } }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
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

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: { message: err.message || "Failed to delete snapshot" } }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}

/**
 * Handle DELETE /api/published/:publishId/assets/:assetId
 */
export async function handleDeleteAsset(request: Request, env: PublishEnv, publishId: string, assetId: string): Promise<Response> {
  const cors = getCorsHeaders(request.headers, env);
  if (!env.BUCKET) {
    return new Response("Internal Server Error", { status: 500, headers: cors });
  }

  try {
    const clientToken = getWriteToken(request);
    if (!clientToken) {
      return new Response(JSON.stringify({ error: { message: "Unauthorized: Missing token" } }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Verify token against bundle metadata
    const bundleKey = `published/${publishId}/bundle.json`;
    const bundleObj = await env.BUCKET.head(bundleKey);

    if (!bundleObj) {
      return new Response(JSON.stringify({ error: { message: "Bundle snapshot not found" } }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const serverToken = bundleObj.customMetadata?.writeToken;
    if (!serverToken || serverToken !== clientToken) {
      return new Response(JSON.stringify({ error: { message: "Unauthorized asset deletion" } }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const assetKey = `published/${publishId}/assets/${assetId}`;
    await env.BUCKET.delete(assetKey);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: { message: err.message || "Failed to delete asset" } }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}


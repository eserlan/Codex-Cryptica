import type { Env } from "./env";
import { getCorsHeaders, isOriginAllowed } from "./cors";
import { enforcePublishRateLimit } from "./rate-limiting";
import {
  handlePublishVault,
  handleGetBundle,
  handleGetManifest,
  handleUploadAsset,
  handleGetAsset,
  handleDeleteVault,
  handleDeleteAsset,
} from "./publish";
import { handleGetPublishedNotice, handlePutPublishedNotice } from "./notice";
import {
  handleDeletePublicListing,
  handleGetPublicListing,
  handlePutPublicListing,
} from "./directory";

export async function handlePublishedRoutes(
  request: Request,
  env: Env,
  pathname: string,
): Promise<Response | null> {
  if (
    pathname !== "/api/publish-vault" &&
    !pathname.startsWith("/api/published/")
  ) {
    return null;
  }

  const origin = request.headers.get("Origin") || "";
  const isReadOnlyPublishedRequest =
    pathname.startsWith("/api/published/") && request.method === "GET";
  if (!isReadOnlyPublishedRequest && !isOriginAllowed(origin, env)) {
    return new Response("Forbidden", {
      status: 403,
      headers: getCorsHeaders(request.headers, env),
    });
  }

  const rateLimitResponse = await enforcePublishRateLimit(
    request,
    env,
    pathname,
  );
  if (rateLimitResponse) return rateLimitResponse;

  if (pathname === "/api/publish-vault") {
    if (request.method === "POST") {
      return handlePublishVault(request, env);
    }
    return new Response("Method not allowed", {
      status: 405,
      headers: getCorsHeaders(request.headers, env),
    });
  }

  const parts = pathname.split("/");
  if (parts.length === 4) {
    // /api/published/:publishId
    if (request.method === "DELETE") {
      return handleDeleteVault(request, env, parts[3]);
    }
    return new Response("Method not allowed", {
      status: 405,
      headers: getCorsHeaders(request.headers, env),
    });
  }

  if (parts.length === 5) {
    // /api/published/:publishId/bundle, manifest, listing, or notice
    if (parts[4] === "notice") {
      if (request.method === "GET") {
        return handleGetPublishedNotice(request, env, parts[3]);
      }
      if (request.method === "PUT") {
        return handlePutPublishedNotice(request, env, parts[3]);
      }
    }
    if (parts[4] === "listing") {
      if (request.method === "GET") {
        return handleGetPublicListing(request, env, parts[3]);
      }
      if (request.method === "PUT") {
        return handlePutPublicListing(request, env, parts[3]);
      }
      if (request.method === "DELETE") {
        return handleDeletePublicListing(request, env, parts[3]);
      }
    }
    if (request.method === "GET") {
      if (parts[4] === "bundle") {
        return handleGetBundle(request, env, parts[3]);
      }
      if (parts[4] === "manifest") {
        return handleGetManifest(request, env, parts[3]);
      }
    }
    return new Response("Method not allowed", {
      status: 405,
      headers: getCorsHeaders(request.headers, env),
    });
  }

  if (parts.length === 6 && parts[4] === "assets") {
    // /api/published/:publishId/assets/:assetId
    if (request.method === "POST") {
      return handleUploadAsset(request, env, parts[3], parts[5]);
    }
    if (request.method === "GET") {
      return handleGetAsset(request, env, parts[3], parts[5]);
    }
    if (request.method === "DELETE") {
      return handleDeleteAsset(request, env, parts[3], parts[5]);
    }
    return new Response("Method not allowed", {
      status: 405,
      headers: getCorsHeaders(request.headers, env),
    });
  }

  return new Response("Not found", {
    status: 404,
    headers: getCorsHeaders(request.headers, env),
  });
}

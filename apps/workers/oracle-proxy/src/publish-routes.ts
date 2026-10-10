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
    return handlePublishVaultRoute(request, env);
  }

  const parts = pathname.split("/");
  if (parts.length === 4) {
    return handlePublishedVaultRoute(request, env, parts[3]);
  }

  if (parts.length === 5) {
    return handlePublishedSubresourceRoute(request, env, parts[3], parts[4]);
  }

  if (parts.length === 6 && parts[4] === "assets") {
    return handlePublishedAssetRoute(request, env, parts[3], parts[5]);
  }

  return new Response("Not found", {
    status: 404,
    headers: getCorsHeaders(request.headers, env),
  });
}

function handlePublishVaultRoute(
  request: Request,
  env: Env,
): Promise<Response> | Response {
  return request.method === "POST"
    ? handlePublishVault(request, env)
    : methodNotAllowed(request, env);
}

function handlePublishedVaultRoute(
  request: Request,
  env: Env,
  publishId: string,
): Promise<Response> | Response {
  return request.method === "DELETE"
    ? handleDeleteVault(request, env, publishId)
    : methodNotAllowed(request, env);
}

function handlePublishedSubresourceRoute(
  request: Request,
  env: Env,
  publishId: string,
  resource: string,
): Promise<Response> | Response {
  if (resource === "notice")
    return handlePublishedNoticeRoute(request, env, publishId);
  if (resource === "listing")
    return handlePublicListingRoute(request, env, publishId);
  if (request.method === "GET")
    return handlePublishedDocumentRoute(request, env, publishId, resource);
  return methodNotAllowed(request, env);
}

function handlePublishedNoticeRoute(
  request: Request,
  env: Env,
  publishId: string,
): Promise<Response> | Response {
  if (request.method === "GET")
    return handleGetPublishedNotice(request, env, publishId);
  if (request.method === "PUT")
    return handlePutPublishedNotice(request, env, publishId);
  return methodNotAllowed(request, env);
}

function handlePublicListingRoute(
  request: Request,
  env: Env,
  publishId: string,
): Promise<Response> | Response {
  if (request.method === "GET")
    return handleGetPublicListing(request, env, publishId);
  if (request.method === "PUT")
    return handlePutPublicListing(request, env, publishId);
  if (request.method === "DELETE")
    return handleDeletePublicListing(request, env, publishId);
  return methodNotAllowed(request, env);
}

function handlePublishedDocumentRoute(
  request: Request,
  env: Env,
  publishId: string,
  resource: string,
): Promise<Response> | Response {
  if (resource === "bundle") return handleGetBundle(request, env, publishId);
  if (resource === "manifest")
    return handleGetManifest(request, env, publishId);
  return methodNotAllowed(request, env);
}

function handlePublishedAssetRoute(
  request: Request,
  env: Env,
  publishId: string,
  assetId: string,
): Promise<Response> | Response {
  if (request.method === "POST")
    return handleUploadAsset(request, env, publishId, assetId);
  if (request.method === "GET")
    return handleGetAsset(request, env, publishId, assetId);
  if (request.method === "DELETE")
    return handleDeleteAsset(request, env, publishId, assetId);
  return methodNotAllowed(request, env);
}

function methodNotAllowed(request: Request, env: Env): Response {
  return new Response("Method not allowed", {
    status: 405,
    headers: getCorsHeaders(request.headers, env),
  });
}

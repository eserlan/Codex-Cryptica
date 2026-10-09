import type { Env } from "./env";
import { getCorsHeaders, isOriginAllowed } from "./cors";
import { enforcePublishRateLimit } from "./rate-limiting";
import {
  handleEnableCloudBackup,
  handleCommitCloudBackup,
  handleCloudBackupAssetUpload,
  handleGetCloudBackupStatus,
  handleGetCloudBackupBundle,
  handleGetCloudBackupIndex,
  handleCloudBackupDelta,
  handleGetCloudBackupAsset,
  handleDeleteCloudBackup,
} from "./cloud-backup";
import {
  handleCloudBackupAdminLookup,
  handleCloudBackupAdminStats,
  handleCloudBackupReissueCode,
  handleCloudBackupAdminDelete,
} from "./cloud-backup-admin";

export async function handleCloudBackupRoutes(
  request: Request,
  env: Env,
  pathname: string,
): Promise<Response | null> {
  if (!pathname.startsWith("/api/cloud-backup/")) return null;

  const origin = request.headers.get("Origin") || "";
  if (origin && !isOriginAllowed(origin, env)) {
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

  // Admin routes first: they are gated by a worker secret rather than a
  // vault's ownership code, and must never be reachable by the patterns
  // below (spec 162, FR-016).
  if (pathname === "/api/cloud-backup/admin/lookup") {
    if (request.method !== "POST")
      return new Response("Method not allowed", {
        status: 405,
        headers: getCorsHeaders(request.headers, env),
      });
    return handleCloudBackupAdminLookup(request, env);
  }

  if (pathname === "/api/cloud-backup/admin/stats") {
    if (request.method !== "GET")
      return new Response("Method not allowed", {
        status: 405,
        headers: getCorsHeaders(request.headers, env),
      });
    return handleCloudBackupAdminStats(request, env);
  }

  if (pathname.startsWith("/api/cloud-backup/admin/")) {
    const parts = pathname.split("/");
    // /api/cloud-backup/admin/{backupId}/reissue-code
    if (
      parts.length === 6 &&
      parts[5] === "reissue-code" &&
      request.method === "POST"
    ) {
      return handleCloudBackupReissueCode(request, env, parts[4]);
    }
    // /api/cloud-backup/admin/{backupId}
    if (parts.length === 5 && request.method === "DELETE") {
      return handleCloudBackupAdminDelete(request, env, parts[4]);
    }
    return new Response("Not found", {
      status: 404,
      headers: getCorsHeaders(request.headers, env),
    });
  }

  if (pathname === "/api/cloud-backup/enable") {
    if (request.method !== "POST")
      return new Response("Method not allowed", {
        status: 405,
        headers: getCorsHeaders(request.headers, env),
      });
    return handleEnableCloudBackup(request, env);
  }

  const parts = pathname.split("/");
  const backupId = parts[3];
  if (backupId) {
    // /api/cloud-backup/{backupId}
    if (parts.length === 4 && request.method === "DELETE") {
      return handleDeleteCloudBackup(request, env, backupId);
    }
    if (parts.length === 5) {
      if (parts[4] === "commit" && request.method === "POST")
        return handleCommitCloudBackup(request, env, backupId);
      if (parts[4] === "status" && request.method === "GET")
        return handleGetCloudBackupStatus(request, env, backupId);
      if (parts[4] === "bundle" && request.method === "GET")
        return handleGetCloudBackupBundle(request, env, backupId);
      if (parts[4] === "index" && request.method === "GET")
        return handleGetCloudBackupIndex(request, env, backupId);
      if (parts[4] === "delta" && request.method === "POST")
        return handleCloudBackupDelta(request, env, backupId);
    }
    // /api/cloud-backup/{backupId}/assets/{assetId}
    if (parts.length === 6 && parts[4] === "assets") {
      const assetId = parts[5];
      if (request.method === "GET")
        return handleGetCloudBackupAsset(request, env, backupId, assetId);
      if (request.method === "PUT")
        return handleCloudBackupAssetUpload(request, env, backupId, assetId);
    }
  }

  return new Response("Not found", {
    status: 404,
    headers: getCorsHeaders(request.headers, env),
  });
}

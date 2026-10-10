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

  const adminResponse = await handleCloudBackupAdminRoutes(
    request,
    env,
    pathname,
  );
  if (adminResponse) return adminResponse;

  return handleCloudBackupResourceRoutes(request, env, pathname);
}

async function handleCloudBackupAdminRoutes(
  request: Request,
  env: Env,
  pathname: string,
): Promise<Response | null> {
  if (!pathname.startsWith("/api/cloud-backup/admin/")) return null;

  // Admin routes first: they are gated by a worker secret rather than a
  // vault's ownership code, and must never be reachable by the patterns
  // below (spec 162, FR-016).
  if (pathname === "/api/cloud-backup/admin/lookup")
    return methodGuardedAdminRoute(request, env, "POST", () =>
      handleCloudBackupAdminLookup(request, env),
    );
  if (pathname === "/api/cloud-backup/admin/stats")
    return methodGuardedAdminRoute(request, env, "GET", () =>
      handleCloudBackupAdminStats(request, env),
    );

  return handleCloudBackupAdminResource(request, env, pathname);
}

function methodGuardedAdminRoute(
  request: Request,
  env: Env,
  method: string,
  handler: () => Promise<Response>,
): Promise<Response> | Response {
  if (request.method === method) return handler();
  return new Response("Method not allowed", {
    status: 405,
    headers: getCorsHeaders(request.headers, env),
  });
}

function handleCloudBackupAdminResource(
  request: Request,
  env: Env,
  pathname: string,
): Promise<Response> | Response {
  const parts = pathname.split("/");
  if (parts.length === 6 && parts[5] === "reissue-code") {
    return request.method === "POST"
      ? handleCloudBackupReissueCode(request, env, parts[4])
      : cloudBackupNotFound(request, env);
  }
  if (parts.length === 5) {
    return request.method === "DELETE"
      ? handleCloudBackupAdminDelete(request, env, parts[4])
      : cloudBackupNotFound(request, env);
  }
  return cloudBackupNotFound(request, env);
}

async function handleCloudBackupResourceRoutes(
  request: Request,
  env: Env,
  pathname: string,
): Promise<Response> {
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
  if (!backupId) return cloudBackupNotFound(request, env);
  if (parts.length === 4)
    return handleCloudBackupRecordRoute(request, env, backupId);
  if (parts.length === 5)
    return handleCloudBackupActionRoute(request, env, backupId, parts[4]);
  if (parts.length === 6 && parts[4] === "assets") {
    return handleCloudBackupAssetRoute(request, env, backupId, parts[5]);
  }
  return cloudBackupNotFound(request, env);
}

function handleCloudBackupRecordRoute(
  request: Request,
  env: Env,
  backupId: string,
) {
  return request.method === "DELETE"
    ? handleDeleteCloudBackup(request, env, backupId)
    : cloudBackupNotFound(request, env);
}

function handleCloudBackupActionRoute(
  request: Request,
  env: Env,
  backupId: string,
  action: string,
) {
  const handlers: Record<
    string,
    { method: string; run: () => Promise<Response> }
  > = {
    commit: {
      method: "POST",
      run: () => handleCommitCloudBackup(request, env, backupId),
    },
    status: {
      method: "GET",
      run: () => handleGetCloudBackupStatus(request, env, backupId),
    },
    bundle: {
      method: "GET",
      run: () => handleGetCloudBackupBundle(request, env, backupId),
    },
    index: {
      method: "GET",
      run: () => handleGetCloudBackupIndex(request, env, backupId),
    },
    delta: {
      method: "POST",
      run: () => handleCloudBackupDelta(request, env, backupId),
    },
  };
  const route = handlers[action];
  return route && request.method === route.method
    ? route.run()
    : cloudBackupNotFound(request, env);
}

function handleCloudBackupAssetRoute(
  request: Request,
  env: Env,
  backupId: string,
  assetId: string,
) {
  if (request.method === "GET")
    return handleGetCloudBackupAsset(request, env, backupId, assetId);
  if (request.method === "PUT")
    return handleCloudBackupAssetUpload(request, env, backupId, assetId);
  return cloudBackupNotFound(request, env);
}

function cloudBackupNotFound(request: Request, env: Env): Response {
  return new Response("Not found", {
    status: 404,
    headers: getCorsHeaders(request.headers, env),
  });
}

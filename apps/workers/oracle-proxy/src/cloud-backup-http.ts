import { CLOUD_BACKUP_LIMITS } from "../../../../packages/schema/src/publishing";

/* ------------------------------------------------------------- responses -- */
export function cors(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
}

export function json(
  request: Request,
  body: unknown,
  status = 200,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(request), "Content-Type": "application/json", ...extra },
  });
}

/**
 * The single response used for both "no such backup" and "wrong code".
 *
 * Returning different bodies or statuses for those two cases would let anyone
 * enumerate which backups exist by trying codes (FR-014), so they are one
 * function rather than two call sites that must remember to stay in step.
 */
export function notFoundOrUnauthorized(request: Request): Response {
  return json(request, { error: { message: "Backup not found" } }, 404);
}

export function storageUnavailable(request: Request): Response {
  return json(request, { error: { message: "Storage unavailable" } }, 500);
}

export function sizeLimitResponse(
  request: Request,
  actualBytes: number,
  limitBytes: number,
  message: string,
): Response | null {
  if (!(actualBytes > limitBytes)) return null;
  return json(request, { error: { message, limitBytes, actualBytes } }, 413);
}

/* ------------------------------------------------------------- payloads -- */
export interface BackupPayload {
  vaultTitle: string;
  bundle: unknown;
  /** Ids of the assets uploaded for this snapshot. Anything else is pruned. */
  assetIds?: string[];
}

/**
 * Rejects an oversized body before it is read.
 *
 * This has to happen first. Reading the body to measure it is what the size
 * limit exists to prevent: a vault large enough to matter would exhaust the
 * Worker's memory during `request.json()`, and the check meant to return a
 * clean 413 would never be reached.
 */
export function tooLargeToRead(
  request: Request,
  limit: number,
): Response | null {
  const declared = Number(request.headers.get("Content-Length"));
  return Number.isFinite(declared)
    ? sizeLimitResponse(request, declared, limit, "This request is too large.")
    : null;
}

/** A size-checked JSON body, or the 413/400 response to return instead. */
export async function readJsonBody(
  request: Request,
): Promise<{ body: unknown } | { response: Response }> {
  const oversized = tooLargeToRead(
    request,
    CLOUD_BACKUP_LIMITS.maxJsonBodyBytes,
  );
  if (oversized) return { response: oversized };
  try {
    return { body: await request.json() };
  } catch {
    return {
      response: json(request, { error: { message: "Invalid JSON" } }, 400),
    };
  }
}

/**
 * An asset id is a storage key segment, so it must not be able to climb out of
 * its prefix or collide with the manifest and bundle objects.
 */
export function isValidAssetId(assetId: string): boolean {
  return (
    !!assetId &&
    assetId.length <= 255 &&
    !assetId.includes("/") &&
    !assetId.includes("\\") &&
    assetId !== "." &&
    assetId !== ".."
  );
}

export function validatePayload(
  request: Request,
  body: unknown,
): { payload: BackupPayload } | { response: Response } {
  const candidate = body as Partial<BackupPayload> | null;
  if (
    !candidate ||
    typeof candidate.vaultTitle !== "string" ||
    !candidate.vaultTitle.trim() ||
    candidate.vaultTitle.length > CLOUD_BACKUP_LIMITS.maxTitleLength ||
    candidate.bundle === undefined
  ) {
    return {
      response: json(
        request,
        { error: { message: "A vault title and bundle are required" } },
        400,
      ),
    };
  }
  if (candidate.assetIds !== undefined) {
    if (
      !Array.isArray(candidate.assetIds) ||
      candidate.assetIds.some(
        (id) => typeof id !== "string" || !isValidAssetId(id),
      )
    ) {
      return {
        response: json(
          request,
          { error: { message: "Invalid asset list" } },
          400,
        ),
      };
    }
  }
  return { payload: candidate as BackupPayload };
}

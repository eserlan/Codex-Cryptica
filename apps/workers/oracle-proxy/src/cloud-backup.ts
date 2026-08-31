/**
 * CC Cloud Backup routes (spec 162, issue #2593).
 *
 * Opt-in, consent-gated backup of a whole vault to the existing R2 bucket under
 * a `cloud-backup/` prefix. Ownership is a per-vault bearer code — there is no
 * account system — so every route except the admin pair authenticates by
 * hashing the presented code and comparing it against the manifest's stored
 * hash. The raw code is never written to storage.
 *
 * Two rules shape most of what follows:
 *
 * - **Wrong code and missing backup must be indistinguishable** (FR-014), so an
 *   attacker cannot probe for which vaults exist.
 * - **The admin lookup must never become a browsing tool** (FR-016), so it
 *   resolves to exactly one match or to nothing, and never paginates.
 */
import {
  CLOUD_BACKUP_LIMITS,
  CloudBackupManifestSchema,
  type CloudBackupManifest,
} from "../../../../packages/schema/src/publishing";

export interface CloudBackupEnv {
  BUCKET?: any;
  ALLOWED_ORIGINS?: string;
  ALLOW_CLOUDFLARE_PAGES_PREVIEW_ORIGINS?: string;
  CLOUD_BACKUP_ADMIN_TOKEN?: string;
}

const PREFIX = "cloud-backup/";
const SCHEMA_VERSION = 1;

/* ------------------------------------------------------------------ keys -- */

export function getManifestKey(backupId: string): string {
  return `${PREFIX}${backupId}/manifest.json`;
}

export function getBundleKey(backupId: string): string {
  return `${PREFIX}${backupId}/bundle.json`;
}

export function getAssetKey(backupId: string, assetId: string): string {
  return `${PREFIX}${backupId}/assets/${assetId}`;
}

export function getBackupPrefix(backupId: string): string {
  return `${PREFIX}${backupId}/`;
}

/* ------------------------------------------------------------- responses -- */

function cors(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
}

function json(
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
function notFoundOrUnauthorized(request: Request): Response {
  return json(request, { error: { message: "Backup not found" } }, 404);
}

/* ----------------------------------------------------------- credentials -- */

/** Reads the bearer credential, tolerating a bare token like the sibling routes. */
export function bearerToken(request: Request): string | null {
  const value = request.headers.get("Authorization");
  return value?.startsWith("Bearer ")
    ? value.slice(7).trim() || null
    : value?.trim() || null;
}

/** SHA-256 hex. Web Crypto only — the worker runs without `nodejs_compat`. */
export async function hashOwnerCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(code),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** A fresh ownership code. Opaque, unguessable, unrelated to the backup id. */
export function generateOwnerCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function readManifest(
  env: CloudBackupEnv,
  backupId: string,
): Promise<{ manifest: CloudBackupManifest; ownerCodeHash?: string } | null> {
  const object = await env.BUCKET?.get(getManifestKey(backupId));
  if (!object) return null;
  try {
    const text =
      typeof object.text === "function"
        ? await object.text()
        : new TextDecoder().decode(object.body);
    const parsed = CloudBackupManifestSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return null;
    return {
      manifest: parsed.data,
      ownerCodeHash: object.customMetadata?.ownerCodeHash,
    };
  } catch {
    return null;
  }
}

/**
 * Resolves a request to its backup, or to the undifferentiated failure response.
 *
 * Returns the manifest on success so callers do not re-read it.
 */
export async function authorize(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
): Promise<
  | { manifest: CloudBackupManifest; ownerCodeHash: string }
  | { response: Response }
> {
  const code = bearerToken(request);
  if (!code) return { response: notFoundOrUnauthorized(request) };

  const record = await readManifest(env, backupId);
  if (!record?.ownerCodeHash)
    return { response: notFoundOrUnauthorized(request) };

  // A backup's code only ever unlocks that backup: the hash compared here comes
  // from the requested backup's own manifest, so another vault's valid code
  // fails exactly like an invalid one (FR-012).
  if (record.ownerCodeHash !== (await hashOwnerCode(code))) {
    return { response: notFoundOrUnauthorized(request) };
  }
  return { manifest: record.manifest, ownerCodeHash: record.ownerCodeHash };
}

function isAdmin(request: Request, env: CloudBackupEnv): boolean {
  const expected = env.CLOUD_BACKUP_ADMIN_TOKEN;
  // Closed by default: with no secret configured, no request is an admin.
  if (!expected) return false;
  return bearerToken(request) === expected;
}

/* ------------------------------------------------------------- payloads -- */

interface BackupPayload {
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
function tooLargeToRead(request: Request, limit: number): Response | null {
  const declared = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declared) && declared > limit) {
    return json(
      request,
      {
        error: {
          message: "This request is too large.",
          limitBytes: limit,
          actualBytes: declared,
        },
      },
      413,
    );
  }
  return null;
}

/** Bytes already stored for a backup, so the vault ceiling can be enforced. */
async function storedBytes(
  env: CloudBackupEnv,
  backupId: string,
): Promise<number> {
  let total = 0;
  const prefix = getBackupPrefix(backupId);
  let listed = await env.BUCKET.list({ prefix });
  for (;;) {
    for (const object of listed.objects) total += object.size ?? 0;
    if (!listed.truncated) break;
    listed = await env.BUCKET.list({ prefix, cursor: listed.cursor });
  }
  return total;
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

function validatePayload(
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

/**
 * Commits a staged snapshot: bundle, then manifest, then prune.
 *
 * Order matters. Assets are already uploaded individually by this point, so
 * the only writes here are small. The manifest lands after the bundle because
 * until it does the backup still describes the previous, complete state; the
 * prune runs last because deleting first would leave a bundle whose media is
 * gone — a corrupt remote copy the user has no way to detect. The worst case
 * is a few orphaned assets, which the next commit clears.
 */
async function commitSnapshot(
  env: CloudBackupEnv,
  backupId: string,
  payload: BackupPayload,
  manifest: CloudBackupManifest,
  ownerCodeHash: string,
): Promise<void> {
  await env.BUCKET.put(getBundleKey(backupId), JSON.stringify(payload.bundle), {
    httpMetadata: { contentType: "application/json" },
  });

  await env.BUCKET.put(getManifestKey(backupId), JSON.stringify(manifest), {
    httpMetadata: { contentType: "application/json" },
    customMetadata: { ownerCodeHash, vaultTitle: manifest.vaultTitle },
  });

  const keep = new Set(
    (payload.assetIds ?? []).map((id) => getAssetKey(backupId, id)),
  );
  await pruneAssets(env, backupId, keep);
}

/** Removes assets under the backup that the new snapshot does not include. */
async function pruneAssets(
  env: CloudBackupEnv,
  backupId: string,
  keep: Set<string>,
): Promise<void> {
  const prefix = `${getBackupPrefix(backupId)}assets/`;
  let listed = await env.BUCKET.list({ prefix });
  while (listed.objects.length > 0) {
    for (const object of listed.objects) {
      if (!keep.has(object.key)) await env.BUCKET.delete(object.key);
    }
    if (!listed.truncated) break;
    listed = await env.BUCKET.list({ prefix, cursor: listed.cursor });
  }
}

/* -------------------------------------------------------------- handlers -- */

/**
 * POST /api/cloud-backup/enable — opens a backup; returns the code once.
 *
 * Creates the manifest and nothing else. Content arrives afterwards: assets one
 * per request, then the bundle with the commit. That keeps every request small
 * enough to stay well inside the Worker's memory ceiling, which a whole vault
 * in one body does not.
 */
export async function handleEnableCloudBackup(
  request: Request,
  env: CloudBackupEnv,
): Promise<Response> {
  if (!env.BUCKET) {
    return json(request, { error: { message: "Storage unavailable" } }, 500);
  }

  const oversized = tooLargeToRead(
    request,
    CLOUD_BACKUP_LIMITS.maxJsonBodyBytes,
  );
  if (oversized) return oversized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(request, { error: { message: "Invalid JSON" } }, 400);
  }

  const candidate = body as { vaultTitle?: unknown } | null;
  const vaultTitle =
    typeof candidate?.vaultTitle === "string" ? candidate.vaultTitle : "";
  if (
    !vaultTitle.trim() ||
    vaultTitle.length > CLOUD_BACKUP_LIMITS.maxTitleLength
  ) {
    return json(
      request,
      { error: { message: "A vault title is required" } },
      400,
    );
  }

  const backupId = crypto.randomUUID();
  const ownerCode = generateOwnerCode();
  const now = new Date().toISOString();
  const manifest: CloudBackupManifest = {
    schemaVersion: SCHEMA_VERSION,
    backupId,
    vaultTitle,
    // Nothing is stored yet; the commit records the real figure.
    sizeBytes: 0,
    createdAt: now,
    lastPushedAt: now,
  };

  await env.BUCKET.put(getManifestKey(backupId), JSON.stringify(manifest), {
    httpMetadata: { contentType: "application/json" },
    customMetadata: {
      ownerCodeHash: await hashOwnerCode(ownerCode),
      vaultTitle,
    },
  });

  // The only time the raw code is ever transmitted.
  return json(request, { backupId, ownerCode, manifest }, 201);
}

/**
 * PUT /api/cloud-backup/{backupId}/assets/{assetId} — one file, raw bytes.
 *
 * Raw rather than base64-in-JSON: base64 inflates by a third and forces both
 * ends to hold the whole vault in memory at once. Streaming one file per
 * request keeps peak memory bounded by a single asset, and lets a failed
 * upload be retried on its own instead of restarting the backup.
 */
export async function handleCloudBackupAssetUpload(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
  assetId: string,
): Promise<Response> {
  if (!env.BUCKET) {
    return json(request, { error: { message: "Storage unavailable" } }, 500);
  }

  const auth = await authorize(request, env, backupId);
  if ("response" in auth) return auth.response;

  if (!isValidAssetId(assetId)) {
    return json(request, { error: { message: "Invalid asset id" } }, 400);
  }

  const oversized = tooLargeToRead(request, CLOUD_BACKUP_LIMITS.maxAssetBytes);
  if (oversized) return oversized;

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > CLOUD_BACKUP_LIMITS.maxAssetBytes) {
    // Reached when Content-Length was absent or understated.
    return json(
      request,
      {
        error: {
          message: "This file is too large to back up.",
          limitBytes: CLOUD_BACKUP_LIMITS.maxAssetBytes,
          actualBytes: bytes.byteLength,
        },
      },
      413,
    );
  }

  const key = getAssetKey(backupId, assetId);
  // Measured against what is already stored, minus whatever this upload
  // replaces, so a re-uploaded file is not counted twice.
  const existing = await env.BUCKET.head(key);
  const projected =
    (await storedBytes(env, backupId)) -
    (existing?.size ?? 0) +
    bytes.byteLength;
  if (projected > CLOUD_BACKUP_LIMITS.maxVaultBytes) {
    return json(
      request,
      {
        error: {
          message: "This vault is too large to back up.",
          limitBytes: CLOUD_BACKUP_LIMITS.maxVaultBytes,
          actualBytes: projected,
        },
      },
      413,
    );
  }

  await env.BUCKET.put(key, bytes, {
    httpMetadata: {
      contentType:
        request.headers.get("Content-Type") || "application/octet-stream",
    },
  });

  return json(request, { assetId, sizeBytes: bytes.byteLength });
}

/**
 * POST /api/cloud-backup/{backupId}/commit — publishes the staged snapshot.
 *
 * Carries the bundle, which is text only and so stays small, plus the ids of
 * the assets that belong to this snapshot. Anything else under the backup is
 * pruned, which is how a deleted image eventually leaves storage.
 */
export async function handleCommitCloudBackup(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
): Promise<Response> {
  if (!env.BUCKET) {
    return json(request, { error: { message: "Storage unavailable" } }, 500);
  }

  const auth = await authorize(request, env, backupId);
  if ("response" in auth) return auth.response;

  const oversized = tooLargeToRead(
    request,
    CLOUD_BACKUP_LIMITS.maxJsonBodyBytes,
  );
  if (oversized) return oversized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(request, { error: { message: "Invalid JSON" } }, 400);
  }

  const validated = validatePayload(request, body);
  if ("response" in validated) return validated.response;
  const { payload } = validated;

  const manifest: CloudBackupManifest = {
    ...auth.manifest,
    vaultTitle: payload.vaultTitle,
    sizeBytes:
      (await storedBytes(env, backupId)) +
      new TextEncoder().encode(JSON.stringify(payload.bundle)).length,
    lastPushedAt: new Date().toISOString(),
  };

  // `authorize` already proved the presented code matches, and a commit never
  // changes it — carry the stored hash through rather than re-deriving it.
  await commitSnapshot(env, backupId, payload, manifest, auth.ownerCodeHash);

  return json(request, { manifest });
}

/** GET /api/cloud-backup/{backupId}/status */
export async function handleGetCloudBackupStatus(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
): Promise<Response> {
  if (!env.BUCKET) {
    return json(request, { error: { message: "Storage unavailable" } }, 500);
  }
  const auth = await authorize(request, env, backupId);
  if ("response" in auth) return auth.response;

  // "syncing" is a client-local transient; the server only knows idle or error.
  return json(request, {
    status: "idle",
    lastPushedAt: auth.manifest.lastPushedAt,
    sizeBytes: auth.manifest.sizeBytes,
  });
}

/** GET /api/cloud-backup/{backupId}/bundle — restore read (FR-006). */
export async function handleGetCloudBackupBundle(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
): Promise<Response> {
  if (!env.BUCKET) {
    return json(request, { error: { message: "Storage unavailable" } }, 500);
  }
  const auth = await authorize(request, env, backupId);
  if ("response" in auth) return auth.response;

  const object = await env.BUCKET.get(getBundleKey(backupId));
  if (!object) return notFoundOrUnauthorized(request);

  const text =
    typeof object.text === "function"
      ? await object.text()
      : new TextDecoder().decode(object.body);

  // A pure read: lastPushedAt is deliberately untouched.
  return json(request, { manifest: auth.manifest, bundle: JSON.parse(text) });
}

/** GET /api/cloud-backup/{backupId}/assets/{assetId} */
export async function handleGetCloudBackupAsset(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
  assetId: string,
): Promise<Response> {
  if (!env.BUCKET) {
    return json(request, { error: { message: "Storage unavailable" } }, 500);
  }
  const auth = await authorize(request, env, backupId);
  if ("response" in auth) return auth.response;

  const object = await env.BUCKET.get(getAssetKey(backupId, assetId));
  if (!object) return notFoundOrUnauthorized(request);

  return new Response(object.body, {
    status: 200,
    headers: {
      ...cors(request),
      "Content-Type":
        object.httpMetadata?.contentType || "application/octet-stream",
    },
  });
}

/** DELETE /api/cloud-backup/{backupId} — permanent erase (FR-010). */
export async function handleDeleteCloudBackup(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
): Promise<Response> {
  if (!env.BUCKET) {
    return json(request, { error: { message: "Storage unavailable" } }, 500);
  }
  const auth = await authorize(request, env, backupId);
  if ("response" in auth) return auth.response;

  const prefix = getBackupPrefix(backupId);
  let listed = await env.BUCKET.list({ prefix });
  while (listed.objects.length > 0) {
    for (const object of listed.objects) await env.BUCKET.delete(object.key);
    if (!listed.truncated) break;
    listed = await env.BUCKET.list({ prefix, cursor: listed.cursor });
  }

  return json(request, { deleted: true });
}

/**
 * POST /api/cloud-backup/admin/lookup — support-only metadata lookup.
 *
 * Deliberately narrow. It resolves to exactly one match or to nothing: two
 * matches return the same empty answer as zero, so an admin never learns how
 * many vaults share a title. The scan reads one bounded page and never
 * paginates onward, because walking the whole prefix is bulk enumeration under
 * another name (FR-016).
 */
export async function handleCloudBackupAdminLookup(
  request: Request,
  env: CloudBackupEnv,
): Promise<Response> {
  if (!isAdmin(request, env)) {
    return json(request, { error: { message: "Not found" } }, 404);
  }
  if (!env.BUCKET) {
    return json(request, { error: { message: "Storage unavailable" } }, 500);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json(request, { error: { message: "Invalid JSON" } }, 400);
  }
  const query =
    typeof body?.vaultTitle === "string" ? body.vaultTitle.trim() : "";
  if (!query) return json(request, { matched: false });

  const listed = await env.BUCKET.list({
    prefix: PREFIX,
    limit: CLOUD_BACKUP_LIMITS.maxLookupScanKeys,
  });

  const normalized = query.toLowerCase();
  const matches = (listed.objects ?? []).filter(
    (object: any) =>
      object.key.endsWith("/manifest.json") &&
      (object.customMetadata?.vaultTitle ?? "").toLowerCase() === normalized,
  );

  // Ambiguous is treated exactly like absent, so "there are three of these"
  // is never leaked. A truncated scan is also treated as no result rather than
  // paginated onward.
  if (matches.length !== 1 || listed.truncated) {
    return json(request, { matched: false });
  }

  const backupId = matches[0].key
    .slice(PREFIX.length)
    .replace("/manifest.json", "");
  const record = await readManifest(env, backupId);
  if (!record) return json(request, { matched: false });

  return json(request, {
    matched: true,
    backupId,
    vaultTitle: record.manifest.vaultTitle,
    sizeBytes: record.manifest.sizeBytes,
    lastPushedAt: record.manifest.lastPushedAt,
  });
}

/**
 * POST /api/cloud-backup/admin/{backupId}/reissue-code
 *
 * Mints a replacement code so a user who lost theirs can self-serve again
 * (FR-017). Only one code is ever valid, so the previous one stops working.
 */
export async function handleCloudBackupReissueCode(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
): Promise<Response> {
  if (!isAdmin(request, env)) {
    return json(request, { error: { message: "Not found" } }, 404);
  }
  if (!env.BUCKET) {
    return json(request, { error: { message: "Storage unavailable" } }, 500);
  }

  const record = await readManifest(env, backupId);
  if (!record) return json(request, { error: { message: "Not found" } }, 404);

  const ownerCode = generateOwnerCode();
  await env.BUCKET.put(
    getManifestKey(backupId),
    JSON.stringify(record.manifest),
    {
      httpMetadata: { contentType: "application/json" },
      customMetadata: {
        ownerCodeHash: await hashOwnerCode(ownerCode),
        vaultTitle: record.manifest.vaultTitle,
      },
    },
  );

  // Support relays this to the user out of band; content is never touched.
  return json(request, { ownerCode });
}

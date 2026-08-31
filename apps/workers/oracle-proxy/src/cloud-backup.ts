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
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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
  assets?: { assetId: string; content: string }[];
}

function measure(payload: BackupPayload): number {
  const bundleBytes = new TextEncoder().encode(
    JSON.stringify(payload.bundle),
  ).length;
  const assetBytes = (payload.assets ?? []).reduce(
    // base64 carries ~4 chars per 3 bytes; close enough to enforce a ceiling.
    (total, asset) => total + Math.floor((asset.content.length * 3) / 4),
    0,
  );
  return bundleBytes + assetBytes;
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
  if (candidate.assets && !Array.isArray(candidate.assets)) {
    return {
      response: json(request, { error: { message: "Invalid assets" } }, 400),
    };
  }
  for (const asset of candidate.assets ?? []) {
    if (
      typeof asset?.assetId !== "string" ||
      !asset.assetId ||
      asset.assetId.includes("/") ||
      typeof asset.content !== "string" ||
      decodeBase64(asset.content) === null
    ) {
      // Caught here so a malformed asset never reaches the write path, where it
      // would abort partway and leave the backup half-replaced.
      return {
        response: json(
          request,
          { error: { message: "An attached file could not be read." } },
          400,
        ),
      };
    }
  }

  const payload = candidate as BackupPayload;
  const actualBytes = measure(payload);
  // Checked before anything is written, so an oversized vault never leaves a
  // partial backup behind (SC-010).
  if (actualBytes > CLOUD_BACKUP_LIMITS.maxVaultBytes) {
    return {
      response: json(
        request,
        {
          error: {
            message: "This vault is too large to back up.",
            limitBytes: CLOUD_BACKUP_LIMITS.maxVaultBytes,
            actualBytes,
          },
        },
        413,
      ),
    };
  }
  return { payload };
}

/** Returns null for anything `atob` refuses, so a bad asset is a 400 not a 500. */
function decodeBase64(content: string): Uint8Array | null {
  try {
    const binary = atob(content);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/**
 * Writes a snapshot, then prunes assets the new snapshot no longer contains.
 *
 * Order matters. Deleting first would mean a failure partway leaves a backup
 * with a bundle and no media — a corrupt remote copy the user has no way to
 * detect. Writing first means the worst case is a few orphaned assets, which
 * the next successful push clears.
 *
 * The manifest is written last for the same reason: until it lands, the backup
 * still describes the previous, complete state.
 */
async function writeBackupObjects(
  env: CloudBackupEnv,
  backupId: string,
  payload: BackupPayload,
  manifest: CloudBackupManifest,
  ownerCodeHash: string,
): Promise<void> {
  await env.BUCKET.put(getBundleKey(backupId), JSON.stringify(payload.bundle), {
    httpMetadata: { contentType: "application/json" },
  });

  const keep = new Set<string>();
  for (const asset of payload.assets ?? []) {
    const bytes = decodeBase64(asset.content);
    if (!bytes) continue; // Already rejected in validation; belt and braces.
    await env.BUCKET.put(getAssetKey(backupId, asset.assetId), bytes);
    keep.add(getAssetKey(backupId, asset.assetId));
  }
  await pruneAssets(env, backupId, keep);

  await env.BUCKET.put(getManifestKey(backupId), JSON.stringify(manifest), {
    httpMetadata: { contentType: "application/json" },
    customMetadata: { ownerCodeHash, vaultTitle: manifest.vaultTitle },
  });
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

/** POST /api/cloud-backup/enable — first backup; returns the code once. */
export async function handleEnableCloudBackup(
  request: Request,
  env: CloudBackupEnv,
): Promise<Response> {
  if (!env.BUCKET) {
    return json(request, { error: { message: "Storage unavailable" } }, 500);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(request, { error: { message: "Invalid JSON" } }, 400);
  }

  const validated = validatePayload(request, body);
  if ("response" in validated) return validated.response;
  const { payload } = validated;

  const backupId = crypto.randomUUID();
  const ownerCode = generateOwnerCode();
  const now = new Date().toISOString();
  const manifest: CloudBackupManifest = {
    schemaVersion: SCHEMA_VERSION,
    backupId,
    vaultTitle: payload.vaultTitle,
    sizeBytes: measure(payload),
    createdAt: now,
    lastPushedAt: now,
  };

  await writeBackupObjects(
    env,
    backupId,
    payload,
    manifest,
    await hashOwnerCode(ownerCode),
  );

  // The only time the raw code is ever transmitted.
  return json(request, { backupId, ownerCode, manifest }, 201);
}

/** POST /api/cloud-backup/{backupId}/push — whole-vault replace (FR-018). */
export async function handlePushCloudBackup(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
): Promise<Response> {
  if (!env.BUCKET) {
    return json(request, { error: { message: "Storage unavailable" } }, 500);
  }

  const auth = await authorize(request, env, backupId);
  if ("response" in auth) return auth.response;

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
    sizeBytes: measure(payload),
    lastPushedAt: new Date().toISOString(),
  };

  // `authorize` already proved the presented code matches, and a push never
  // changes it — carry the stored hash through rather than re-deriving it.
  await writeBackupObjects(
    env,
    backupId,
    payload,
    manifest,
    auth.ownerCodeHash,
  );

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

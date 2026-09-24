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
  CLOUD_BACKUP_SCHEMA_V2,
  CLOUD_BACKUP_SHARD_COUNT,
  CloudBackupDeltaSchema,
  CloudBackupManifestSchema,
  cloudBackupShardOf,
  hashCloudBackupEntity,
  type CloudBackupDelta,
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

/** v2 (#3354): one shard of entities, `{ [entityId]: entity }`. */
export function getShardKey(backupId: string, shard: string): string {
  return `${PREFIX}${backupId}/entities/${shard}.json`;
}

/**
 * v2 (#3354): `{ entityHashes: { [entityId]: sha256 } }`. Kept out of the
 * manifest on purpose — every authorised request reads the manifest, and a
 * per-entity hash map would make each of them pay for the whole vault's index.
 */
export function getIndexKey(backupId: string): string {
  return `${PREFIX}${backupId}/index.json`;
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

/** A size-checked JSON body, or the 413/400 response to return instead. */
async function readJsonBody(
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
): Promise<CloudBackupManifest> {
  const entities = bundleEntities(payload.bundle);
  let committed = manifest;
  if (entities) {
    // Schema v2 (#3354): shard the entities so later uploads can be deltas.
    const { entities: _entities, ...rest } = payload.bundle as Record<
      string,
      unknown
    >;
    await writeShards(env, backupId, groupByShard(entities), true);
    await writeIndex(env, backupId, await hashEntities(entities));
    await writeJson(env, getBundleKey(backupId), rest);
    committed = {
      ...manifest,
      schemaVersion: CLOUD_BACKUP_SCHEMA_V2,
      shardCount: CLOUD_BACKUP_SHARD_COUNT,
      entityCount: entities.length,
    };
  } else {
    await writeJson(env, getBundleKey(backupId), payload.bundle);
  }

  await writeManifest(env, backupId, committed, ownerCodeHash);

  const keep = new Set(
    (payload.assetIds ?? []).map((id) => getAssetKey(backupId, id)),
  );
  await pruneAssets(env, backupId, keep);
  return committed;
}

/* ----------------------------------------------------- v2 entity shards -- */

type EntityRecord = { id: string } & Record<string, unknown>;
type Shard = Record<string, EntityRecord>;

/** The bundle's entity list when it is shardable; otherwise stored as v1. */
function bundleEntities(bundle: unknown): EntityRecord[] | null {
  const entities = (bundle as { entities?: unknown } | null)?.entities;
  if (!Array.isArray(entities)) return null;
  return entities.every(
    (entity) =>
      !!entity &&
      typeof entity === "object" &&
      typeof (entity as { id?: unknown }).id === "string",
  )
    ? (entities as EntityRecord[])
    : null;
}

function groupByShard(entities: EntityRecord[]): Map<string, Shard> {
  const shards = new Map<string, Shard>();
  for (const entity of entities) {
    const name = cloudBackupShardOf(entity.id);
    const shard = shards.get(name) ?? Object.create(null);
    shard[entity.id] = entity;
    shards.set(name, shard);
  }
  return shards;
}

async function hashEntities(
  entities: EntityRecord[],
): Promise<Record<string, string>> {
  const hashes: Record<string, string> = Object.create(null);
  for (const entity of entities) {
    hashes[entity.id] = await hashCloudBackupEntity(entity);
  }
  return hashes;
}

async function readJson<T>(
  env: CloudBackupEnv,
  key: string,
): Promise<T | null> {
  const object = await env.BUCKET.get(key);
  if (!object) return null;
  const text =
    typeof object.text === "function"
      ? await object.text()
      : new TextDecoder().decode(object.body);
  return JSON.parse(text) as T;
}

async function writeJson(
  env: CloudBackupEnv,
  key: string,
  value: unknown,
): Promise<void> {
  await env.BUCKET.put(key, JSON.stringify(value), {
    httpMetadata: { contentType: "application/json" },
  });
}

async function writeManifest(
  env: CloudBackupEnv,
  backupId: string,
  manifest: CloudBackupManifest,
  ownerCodeHash: string,
): Promise<void> {
  await env.BUCKET.put(getManifestKey(backupId), JSON.stringify(manifest), {
    httpMetadata: { contentType: "application/json" },
    customMetadata: { ownerCodeHash, vaultTitle: manifest.vaultTitle },
  });
}

async function writeIndex(
  env: CloudBackupEnv,
  backupId: string,
  entityHashes: Record<string, string>,
): Promise<void> {
  await writeJson(env, getIndexKey(backupId), { entityHashes });
}

/**
 * Writes the given shards; an empty shard is deleted rather than stored. With
 * `replaceAll`, any existing shard not in the map is removed too, which is how
 * a full commit drops entities that no longer exist.
 */
async function writeShards(
  env: CloudBackupEnv,
  backupId: string,
  shards: Map<string, Shard>,
  replaceAll: boolean,
): Promise<void> {
  for (const [name, shard] of shards) {
    const key = getShardKey(backupId, name);
    if (Object.keys(shard).length === 0) await env.BUCKET.delete(key);
    else await writeJson(env, key, shard);
  }
  if (!replaceAll) return;
  const keep = new Set(
    [...shards.keys()].map((name) => getShardKey(backupId, name)),
  );
  for (const key of await listKeys(
    env,
    `${getBackupPrefix(backupId)}entities/`,
  )) {
    if (!keep.has(key)) await env.BUCKET.delete(key);
  }
}

async function listKeys(
  env: CloudBackupEnv,
  prefix: string,
): Promise<string[]> {
  const keys: string[] = [];
  let listed = await env.BUCKET.list({ prefix });
  for (;;) {
    for (const object of listed.objects) keys.push(object.key);
    if (!listed.truncated) break;
    listed = await env.BUCKET.list({ prefix, cursor: listed.cursor });
  }
  return keys;
}

/** Every entity of a v2 backup, assembled from its shards. */
async function readAllEntities(
  env: CloudBackupEnv,
  backupId: string,
): Promise<EntityRecord[]> {
  const entities: EntityRecord[] = [];
  const keys = await listKeys(env, `${getBackupPrefix(backupId)}entities/`);
  for (const key of keys.sort()) {
    const shard = await readJson<Shard>(env, key);
    if (shard) entities.push(...Object.values(shard));
  }
  return entities;
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

  const read = await readJsonBody(request);
  if ("response" in read) return read.response;
  const { body } = read;

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
  const committed = await commitSnapshot(
    env,
    backupId,
    payload,
    manifest,
    auth.ownerCodeHash,
  );

  return json(request, { manifest: committed });
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

  const bundle = await readJson<Record<string, unknown>>(
    env,
    getBundleKey(backupId),
  );
  if (!bundle) return notFoundOrUnauthorized(request);

  // v2 keeps entities in shards; restore clients see the same shape either way.
  if (auth.manifest.schemaVersion === CLOUD_BACKUP_SCHEMA_V2) {
    bundle.entities = await readAllEntities(env, backupId);
  }

  // A pure read: lastPushedAt is deliberately untouched.
  return json(request, { manifest: auth.manifest, bundle });
}

/**
 * GET /api/cloud-backup/{backupId}/index (#3354) — per-entity content hashes of
 * a v2 backup, for the client's idle consistency check. Hashes only, never
 * content. A v1 backup has no index and returns an empty map.
 */
export async function handleGetCloudBackupIndex(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
): Promise<Response> {
  if (!env.BUCKET) {
    return json(request, { error: { message: "Storage unavailable" } }, 500);
  }
  const auth = await authorize(request, env, backupId);
  if ("response" in auth) return auth.response;

  const index = await readJson<{ entityHashes: Record<string, string> }>(
    env,
    getIndexKey(backupId),
  );
  return json(request, {
    lastPushedAt: auth.manifest.lastPushedAt,
    entityHashes: index?.entityHashes ?? {},
  });
}

/* ----------------------------------------------------------------- delta -- */

function conflict(
  request: Request,
  code: "full_push_required" | "diverged",
  message: string,
  lastPushedAt: string,
): Response {
  return json(request, { error: { code, message, lastPushedAt } }, 409);
}

/** Applies a delta's upserts and deletes to only the shards they touch. */
async function applyEntityDelta(
  env: CloudBackupEnv,
  backupId: string,
  delta: CloudBackupDelta,
): Promise<{ shards: Map<string, Shard>; hashes: Record<string, string> }> {
  const touched = new Set<string>();
  for (const entity of delta.upserts)
    touched.add(cloudBackupShardOf(entity.id));
  for (const id of delta.deletes) touched.add(cloudBackupShardOf(id));

  const shards = new Map<string, Shard>();
  for (const name of touched) {
    shards.set(
      name,
      (await readJson<Shard>(env, getShardKey(backupId, name))) ??
        Object.create(null),
    );
  }

  const index = await readJson<{ entityHashes: Record<string, string> }>(
    env,
    getIndexKey(backupId),
  );
  const hashes = Object.assign(
    Object.create(null) as Record<string, string>,
    index?.entityHashes ?? {},
  );
  for (const id of delta.deletes) {
    delete shards.get(cloudBackupShardOf(id))![id];
    delete hashes[id];
  }
  for (const entity of delta.upserts as EntityRecord[]) {
    shards.get(cloudBackupShardOf(entity.id))![entity.id] = entity;
    hashes[entity.id] = await hashCloudBackupEntity(entity);
  }
  return { shards, hashes };
}

/** Bytes the changed shards add to the stored total, for the vault ceiling. */
async function shardGrowth(
  env: CloudBackupEnv,
  backupId: string,
  shards: Map<string, Shard>,
): Promise<number> {
  let growth = 0;
  for (const [name, shard] of shards) {
    const existing = await env.BUCKET.head(getShardKey(backupId, name));
    growth +=
      new TextEncoder().encode(JSON.stringify(shard)).length -
      (existing?.size ?? 0);
  }
  return growth;
}

async function indexGrowth(
  env: CloudBackupEnv,
  backupId: string,
  hashes: Record<string, string>,
): Promise<number> {
  const existing = await env.BUCKET.head(getIndexKey(backupId));
  return (
    new TextEncoder().encode(JSON.stringify({ entityHashes: hashes })).length -
    (existing?.size ?? 0)
  );
}

async function prepareBundleSections(
  env: CloudBackupEnv,
  backupId: string,
  delta: CloudBackupDelta,
): Promise<{
  bundle: Record<string, unknown> | null;
  growth: number;
}> {
  const sections = {
    ...(delta.maps ? { maps: delta.maps } : {}),
    ...(delta.canvases ? { canvases: delta.canvases } : {}),
    ...(delta.assetManifest ? { assetManifest: delta.assetManifest } : {}),
  };
  if (Object.keys(sections).length === 0) return { bundle: null, growth: 0 };

  const key = getBundleKey(backupId);
  const [bundle, existing] = await Promise.all([
    readJson<Record<string, unknown>>(env, key),
    env.BUCKET.head(key),
  ]);
  const nextBundle = { ...(bundle ?? {}), ...sections };
  return {
    bundle: nextBundle,
    growth:
      new TextEncoder().encode(JSON.stringify(nextBundle)).length -
      (existing?.size ?? 0),
  };
}

async function writeBundleSections(
  env: CloudBackupEnv,
  backupId: string,
  bundle: Record<string, unknown> | null,
): Promise<void> {
  if (bundle) await writeJson(env, getBundleKey(backupId), bundle);
}

/**
 * POST /api/cloud-backup/{backupId}/delta (#3354) — publishes only what changed.
 *
 * Refuses (409) unless the backup is already v2 and the client computed the
 * delta against the current remote (`baseLastPushedAt`), so a delta can never
 * land on a copy it does not describe. Same write order as a full commit:
 * shards and index, then `bundle.json` if its sections changed, then the
 * manifest, then prune.
 */
export async function handleCloudBackupDelta(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
): Promise<Response> {
  if (!env.BUCKET) {
    return json(request, { error: { message: "Storage unavailable" } }, 500);
  }

  const auth = await authorize(request, env, backupId);
  if ("response" in auth) return auth.response;

  const read = await readJsonBody(request);
  if ("response" in read) return read.response;
  const { body } = read;
  const parsed = CloudBackupDeltaSchema.safeParse(body);
  if (
    !parsed.success ||
    (parsed.data.assetIds ?? []).some((id) => !isValidAssetId(id))
  ) {
    return json(request, { error: { message: "Invalid delta" } }, 400);
  }
  const delta = parsed.data;

  const { manifest } = auth;
  if (manifest.schemaVersion !== CLOUD_BACKUP_SCHEMA_V2) {
    return conflict(
      request,
      "full_push_required",
      "This backup needs one full upload before it can accept changes.",
      manifest.lastPushedAt,
    );
  }
  if (delta.baseLastPushedAt !== manifest.lastPushedAt) {
    return conflict(
      request,
      "diverged",
      "The cloud backup changed since this upload was prepared.",
      manifest.lastPushedAt,
    );
  }

  const { shards, hashes } = await applyEntityDelta(env, backupId, delta);
  const bundleUpdate = await prepareBundleSections(env, backupId, delta);
  const projected =
    (await storedBytes(env, backupId)) +
    (await shardGrowth(env, backupId, shards)) +
    (await indexGrowth(env, backupId, hashes)) +
    bundleUpdate.growth;
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

  await writeShards(env, backupId, shards, false);
  await writeIndex(env, backupId, hashes);
  await writeBundleSections(env, backupId, bundleUpdate.bundle);

  const committed: CloudBackupManifest = {
    ...manifest,
    vaultTitle: delta.vaultTitle,
    entityCount: Object.keys(hashes).length,
    sizeBytes: await storedBytes(env, backupId),
    lastPushedAt: new Date().toISOString(),
  };
  await writeManifest(env, backupId, committed, auth.ownerCodeHash);

  if (delta.assetIds) {
    await pruneAssets(
      env,
      backupId,
      new Set(delta.assetIds.map((id) => getAssetKey(backupId, id))),
    );
  }

  return json(request, { manifest: committed });
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

/**
 * Erases every object under a backup's prefix: manifest, bundle and assets.
 *
 * Shared by the owner and admin delete routes on purpose. Two copies of this
 * loop is how one of them ends up leaving orphaned assets behind after the
 * manifest is gone — unreachable, unbilled to anyone, and invisible.
 */
async function eraseBackupObjects(
  env: CloudBackupEnv,
  backupId: string,
): Promise<void> {
  const prefix = getBackupPrefix(backupId);
  let listed = await env.BUCKET.list({ prefix });
  while (listed.objects.length > 0) {
    for (const object of listed.objects) await env.BUCKET.delete(object.key);
    if (!listed.truncated) break;
    listed = await env.BUCKET.list({ prefix, cursor: listed.cursor });
  }
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

  await eraseBackupObjects(env, backupId);

  return json(request, { deleted: true });
}

/**
 * DELETE /api/cloud-backup/admin/{backupId} — operator erase.
 *
 * The owner route needs the vault's code, which is exactly what a user who
 * cleared their browser, lost the device or wants a takedown no longer has.
 * This is the operator's equivalent: same erase, authorised by the support
 * token rather than the vault code.
 *
 * It deletes by explicit backup id only — there is no "delete everything
 * matching" here, for the same reason the lookup route refuses to enumerate.
 * Like the other admin routes it answers 404 rather than 401 when the token is
 * wrong, so probing cannot distinguish a bad token from a missing backup.
 */
export async function handleCloudBackupAdminDelete(
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

  // Reported so an operator running a takedown knows whether they erased
  // something or were handed a stale id.
  const existed = (await readManifest(env, backupId)) !== null;
  await eraseBackupObjects(env, backupId);

  return json(request, { deleted: true, existed });
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

/** Hard ceiling on how many objects a stats scan will walk, regardless of how
 * many pages that takes. Existing purely so a very large bucket fails safely
 * (a bounded, honestly-labelled undercount) instead of running the Worker out
 * of CPU time. */
const MAX_STATS_SCAN_OBJECTS = 200_000;

/**
 * GET /api/cloud-backup/admin/stats — aggregate counts only.
 *
 * Deliberately the opposite shape from the lookup above: this one *does* walk
 * the whole `cloud-backup/` prefix, because the only thing it returns is
 * summed totals — vault count, total stored bytes, total asset count. It never
 * returns a title, a backup id, or anything else that identifies one vault, so
 * it does not reopen the bulk-enumeration door FR-016 closes: an operator
 * learns "how many" and "how big", never "which ones".
 */
export async function handleCloudBackupAdminStats(
  request: Request,
  env: CloudBackupEnv,
): Promise<Response> {
  if (!isAdmin(request, env)) {
    return json(request, { error: { message: "Not found" } }, 404);
  }
  if (!env.BUCKET) {
    return json(request, { error: { message: "Storage unavailable" } }, 500);
  }

  let vaultCount = 0;
  let assetCount = 0;
  let totalBytes = 0;
  let objectsScanned = 0;
  let cursor: string | undefined;
  let complete = true;

  do {
    const listed = await env.BUCKET.list({
      prefix: PREFIX,
      cursor,
      limit: 1000,
    });
    for (const object of listed.objects ?? []) {
      objectsScanned += 1;
      totalBytes += object.size ?? 0;
      if (object.key.endsWith("/manifest.json")) vaultCount += 1;
      else if (object.key.includes("/assets/")) assetCount += 1;
    }
    if (objectsScanned >= MAX_STATS_SCAN_OBJECTS && listed.truncated) {
      complete = false;
      break;
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  return json(request, {
    vaultCount,
    assetCount,
    totalBytes,
    // False only if the bucket is large enough to hit MAX_STATS_SCAN_OBJECTS —
    // the counts above are then a floor, not the true total.
    complete,
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

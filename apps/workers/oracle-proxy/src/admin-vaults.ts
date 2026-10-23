import { readSuspensionMarker } from "./suspension";
import {
  PREFIX as BACKUP_PREFIX,
  isAdmin,
  json,
  readManifest,
  type CloudBackupEnv,
} from "./cloud-backup";

/**
 * Operator vault inventory (spec 162, FR-024): one paged, metadata-only list
 * of private Cloud Backups and one of published vaults, for `/admin/vaults`.
 *
 * Rows are built field by field from what is safe to show. Nothing is spread
 * from R2 metadata, because the same objects carry an ownership-code hash
 * (backups) or a write token (published bundles).
 */

const PUBLISHED_PREFIX = "published/";
/** Keeps each request to ~150 R2 operations, well inside a Worker's budget. */
export const ADMIN_VAULT_PAGE_SIZE = 50;

export interface AdminVaultRow {
  id: string;
  title: string;
  sizeBytes: number;
  entityCount: number | null;
  createdAt: string | null;
  lastActiveAt: string | null;
  /** Published vaults only: the moderation state, if any. */
  suspension?: "delist" | "disable" | null;
}

interface AdminVaultPage {
  vaults: AdminVaultRow[];
  cursor: string | null;
}

/** One page of vault ids: the `{id}/` folders directly under a prefix. */
async function listVaultIds(
  env: CloudBackupEnv,
  prefix: string,
  cursor: string | undefined,
): Promise<{ ids: string[]; cursor: string | null }> {
  const listed = await env.BUCKET.list({
    prefix,
    delimiter: "/",
    limit: ADMIN_VAULT_PAGE_SIZE,
    cursor,
  });
  const ids = (listed.delimitedPrefixes ?? []).map((folder: string) =>
    folder.slice(prefix.length, -1),
  );
  return { ids, cursor: listed.truncated ? (listed.cursor ?? null) : null };
}

async function backupRow(
  env: CloudBackupEnv,
  id: string,
): Promise<AdminVaultRow | null> {
  const record = await readManifest(env, id);
  if (!record) return null;
  const { manifest } = record;
  return {
    id,
    title: manifest.vaultTitle,
    sizeBytes: manifest.sizeBytes,
    entityCount: manifest.entityCount ?? null,
    createdAt: manifest.createdAt,
    lastActiveAt: manifest.lastPushedAt,
  };
}

async function folderBytes(env: CloudBackupEnv, prefix: string) {
  let bytes = 0;
  let cursor: string | undefined;
  do {
    const listed = await env.BUCKET.list({ prefix, cursor });
    for (const object of listed.objects ?? []) bytes += object.size ?? 0;
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
  return bytes;
}

/** Safe fields from a published bundle's metadata; never the write token. */
function publishedMetadata(meta: Record<string, string>) {
  const entityCount = Number.parseInt(meta.entityCount ?? "", 10);
  return {
    title: meta.vaultTitle || "Untitled World",
    entityCount: Number.isFinite(entityCount) ? entityCount : null,
    lastActiveAt: meta.publishedAt || null,
  };
}

async function publishedRow(
  env: CloudBackupEnv,
  id: string,
): Promise<AdminVaultRow | null> {
  const bundle = await env.BUCKET.head(`${PUBLISHED_PREFIX}${id}/bundle.json`);
  if (!bundle) return null;
  const [assetBytes, suspension] = await Promise.all([
    folderBytes(env, `${PUBLISHED_PREFIX}${id}/assets/`),
    readSuspensionMarker(env, id),
  ]);
  return {
    id,
    ...publishedMetadata(bundle.customMetadata ?? {}),
    sizeBytes: (bundle.size ?? 0) + assetBytes,
    createdAt: null,
    suspension: suspension?.mode ?? null,
  };
}

async function loadPage(
  env: CloudBackupEnv,
  prefix: string,
  cursor: string | undefined,
  readRow: (env: CloudBackupEnv, id: string) => Promise<AdminVaultRow | null>,
): Promise<AdminVaultPage> {
  const page = await listVaultIds(env, prefix, cursor);
  const rows = await Promise.all(page.ids.map((id) => readRow(env, id)));
  return {
    // A folder without a readable manifest or bundle is a half-written or
    // half-deleted vault; it is skipped rather than shown as a blank row.
    vaults: rows.filter((row): row is AdminVaultRow => row !== null),
    cursor: page.cursor,
  };
}

/** GET /api/admin/vaults/{backups|published}?cursor= */
export async function handleAdminVaultRoutes(
  request: Request,
  env: CloudBackupEnv,
  pathname: string,
): Promise<Response | null> {
  if (!pathname.startsWith("/api/admin/vaults/")) return null;
  // Same answer for a wrong token and an unknown path, as on the other admin
  // routes, so probing learns nothing.
  if (!isAdmin(request, env)) {
    return json(request, { error: { message: "Not found" } }, 404);
  }
  if (request.method !== "GET") {
    return json(request, { error: { message: "Method not allowed" } }, 405);
  }
  if (!env.BUCKET) {
    return json(request, { error: { message: "Storage unavailable" } }, 500);
  }
  const cursor = new URL(request.url).searchParams.get("cursor") || undefined;
  if (pathname === "/api/admin/vaults/backups") {
    return json(request, await loadPage(env, BACKUP_PREFIX, cursor, backupRow));
  }
  if (pathname === "/api/admin/vaults/published") {
    return json(
      request,
      await loadPage(env, PUBLISHED_PREFIX, cursor, publishedRow),
    );
  }
  return json(request, { error: { message: "Not found" } }, 404);
}

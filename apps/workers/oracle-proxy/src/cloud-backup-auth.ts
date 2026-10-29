import type { CloudBackupManifest } from "../../../../packages/schema/src/publishing";
import { readManifest, type CloudBackupEnv } from "./cloud-backup-storage";
import {
  notFoundOrUnauthorized,
  storageUnavailable,
} from "./cloud-backup-http";

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
  return bytesToHex(new Uint8Array(digest));
}

/** A fresh ownership code. Opaque, unguessable, unrelated to the backup id. */
export function generateOwnerCode(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
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

export function isAdmin(request: Request, env: CloudBackupEnv): boolean {
  const expected = env.CLOUD_BACKUP_ADMIN_TOKEN;
  // Closed by default: with no secret configured, no request is an admin.
  if (!expected) return false;
  return bearerToken(request) === expected;
}

/** Storage must be available before any protected route reads credentials. */
export async function authorizeStoredBackup(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
): ReturnType<typeof authorize> {
  if (!env.BUCKET) return { response: storageUnavailable(request) };
  return authorize(request, env, backupId);
}

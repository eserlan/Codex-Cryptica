import type { CloudBackupRuntime } from "./runtime";

/** What a request needs to prove who is asking. */
export interface CloudBackupCredentials {
  backupId: string;
  /** The owner code, or the editor token when `role` is `"editor"`. */
  ownerCode: string;
  role?: "owner" | "editor";
}

/**
 * The headers for one cloud-backup request. The credential only ever travels
 * in `Authorization`; an editor also names its device so the worker can apply
 * the device cap. Owner requests carry no device header.
 */
export function cloudBackupHeaders(
  runtime: CloudBackupRuntime,
  credentials: CloudBackupCredentials,
  extra: Record<string, string> = {},
): Record<string, string> {
  const headers: Record<string, string> = {
    ...extra,
    Authorization: `Bearer ${credentials.ownerCode}`,
  };
  if (credentials.role === "editor" && runtime.deviceId) {
    headers["X-Codex-Device-Id"] = runtime.deviceId();
  }
  return headers;
}

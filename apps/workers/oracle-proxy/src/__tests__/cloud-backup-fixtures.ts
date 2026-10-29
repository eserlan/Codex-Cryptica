import type { CloudBackupManifest } from "../../../../../packages/schema/src/publishing";
import { handleEnableCloudBackup } from "../cloud-backup-lifecycle";
import { Bucket } from "./r2-memory-bucket";

export function ownerRequest(
  ownerCode?: string,
  init: RequestInit = {},
): Request {
  const headers = new Headers(init.headers);
  if (ownerCode) headers.set("Authorization", `Bearer ${ownerCode}`);
  return new Request("https://example.test/api/cloud-backup", {
    ...init,
    headers,
  });
}

export function jsonRequest(body: unknown, ownerCode?: string): Request {
  return ownerRequest(ownerCode, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function createBackupFixture() {
  const env = { BUCKET: new Bucket() };
  const response = await handleEnableCloudBackup(
    jsonRequest({ vaultTitle: "Vault" }),
    env,
  );
  const opened = (await response.json()) as {
    backupId: string;
    ownerCode: string;
    manifest: CloudBackupManifest;
  };
  return { env, ...opened };
}

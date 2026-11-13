import { describe, expect, it } from "vitest";
import {
  attachCloudBackup,
  deleteCloudBackup,
  disableCloudBackup,
  enableCloudBackup,
} from "./backup-lifecycle";
import { getLocalCloudBackupRecord } from "./backup-records";
import { MANIFEST, PAYLOAD, enabled, makeRuntime } from "./test-helpers";

describe("backup lifecycle", () => {
  it("attaches a never-pushed backup and keeps its consent when re-enabled", async () => {
    const { runtime, calls } = makeRuntime([
      { ok: true, status: 200, body: { lastPushedAt: null } },
    ]);
    const credentials = { backupId: "attached", ownerCode: "owner" };
    const attached = await attachCloudBackup(runtime, "vault", credentials);
    expect(attached.ok && attached.value.lastPushedAt).toBeNull();
    const consent = (await getLocalCloudBackupRecord(runtime, "vault"))
      ?.consentedAt;
    await disableCloudBackup(runtime, "vault");
    runtime.now = () => new Date("2026-09-01T12:00:00.000Z");
    const resumed = await enableCloudBackup(runtime, "vault", PAYLOAD);
    expect(resumed.ok && resumed.value.backupId).toBe("attached");
    expect(resumed.ok && resumed.value.consentedAt).toBe(consent);
    expect(calls).toHaveLength(1);
  });

  it("rejects an enable response without a push timestamp without storing credentials", async () => {
    const { runtime } = makeRuntime([
      {
        ok: true,
        status: 201,
        body: {
          backupId: "b",
          ownerCode: "o",
          manifest: { ...MANIFEST, lastPushedAt: null },
        },
      },
    ]);
    expect(await enableCloudBackup(runtime, "vault", PAYLOAD)).toEqual({
      ok: false,
      error: "The backup service returned an unreadable response.",
    });
    expect(await getLocalCloudBackupRecord(runtime, "vault")).toBeNull();
  });

  it("retains a disabled backup's credentials when remote deletion fails", async () => {
    const { runtime } = await enabled({ ok: false, status: 503, body: null });
    await disableCloudBackup(runtime, "v-1");
    const before = await getLocalCloudBackupRecord(runtime, "v-1");
    expect(await deleteCloudBackup(runtime, "v-1")).toEqual({
      ok: false,
      error: "Request failed (503)",
      status: 503,
    });
    expect(await getLocalCloudBackupRecord(runtime, "v-1")).toEqual(before);
  });
});

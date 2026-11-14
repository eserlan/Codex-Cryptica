import { describe, expect, it, vi } from "vitest";
import { pushVaultToCloudBackup } from "./snapshot-sync";
import { getLocalCloudBackupRecord } from "./backup-records";
import { MANIFEST, PAYLOAD, enabled } from "./test-helpers";

describe("snapshot sync", () => {
  it("reads the guard before committing and persists the renamed vault", async () => {
    const { runtime, calls } = await enabled({
      ok: true,
      status: 200,
      body: { lastPushedAt: MANIFEST.lastPushedAt },
    });
    expect(
      await pushVaultToCloudBackup(
        runtime,
        "v-1",
        { ...PAYLOAD, vaultTitle: "Renamed" },
        undefined,
        { expectLastPushedAt: MANIFEST.lastPushedAt },
      ),
    ).toEqual({ ok: true, value: MANIFEST });
    expect(calls.map((call) => call.url.split("/").at(-1))).toEqual([
      "status",
      "commit",
    ]);
    expect(await getLocalCloudBackupRecord(runtime, "v-1")).toMatchObject({
      status: "idle",
      vaultTitle: "Renamed",
    });
  });

  it("pauses when the remote timestamp is older or missing", async () => {
    const { runtime, calls } = await enabled({
      ok: true,
      status: 200,
      body: { lastPushedAt: null },
    });
    expect(
      await pushVaultToCloudBackup(runtime, "v-1", PAYLOAD, undefined, {
        expectLastPushedAt: MANIFEST.lastPushedAt,
      }),
    ).toEqual({
      ok: false,
      error: "The cloud backup changed unexpectedly. Automatic sync paused.",
      conflict: true,
      remoteLastPushedAt: null,
    });
    expect(calls).toHaveLength(1);
    expect((await getLocalCloudBackupRecord(runtime, "v-1"))?.status).toBe(
      "error",
    );
  });

  it("sends no content if the guard cannot reach the backup", async () => {
    const { runtime, calls } = await enabled({
      ok: false,
      status: 503,
      body: null,
    });
    expect(
      await pushVaultToCloudBackup(runtime, "v-1", PAYLOAD, undefined, {
        expectLastPushedAt: null,
      }),
    ).toEqual({ ok: false, error: "Request failed (503)", status: 503 });
    expect(calls).toHaveLength(1);
    expect((await getLocalCloudBackupRecord(runtime, "v-1"))?.status).toBe(
      "error",
    );
  });

  it("propagates transport exceptions when not cancelled", async () => {
    const { runtime } = await enabled();
    runtime.fetch = vi.fn().mockRejectedValue(new Error("Offline"));
    await expect(
      pushVaultToCloudBackup(runtime, "v-1", PAYLOAD),
    ).rejects.toThrow("Offline");
  });

  it("stores the revision of a full commit", async () => {
    const { runtime } = await enabled({
      ok: true,
      status: 200,
      body: { manifest: { ...MANIFEST, revision: 3 } },
    });
    await pushVaultToCloudBackup(runtime, "v-1", PAYLOAD);
    expect((await getLocalCloudBackupRecord(runtime, "v-1"))?.revision).toBe(3);
  });

  it("drops a stale revision when the worker returns none", async () => {
    const { runtime } = await enabled();
    const record = (await getLocalCloudBackupRecord(runtime, "v-1"))!;
    await runtime.storage.write("v-1", { ...record, revision: 2 });
    await pushVaultToCloudBackup(runtime, "v-1", PAYLOAD);
    expect(await getLocalCloudBackupRecord(runtime, "v-1")).not.toHaveProperty(
      "revision",
    );
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  fetchCloudBackupIndex,
  getCloudBackupStatus,
  readRemoteLastPushedAt,
} from "./backup-metadata";
import { enabled, makeRuntime } from "./test-helpers";

const credentials = { backupId: "backup", ownerCode: "owner" };

describe("backup metadata", () => {
  it("reads the guard timestamp with credentials and cancellation signal", async () => {
    const { runtime, calls } = makeRuntime([
      { ok: true, status: 200, body: { lastPushedAt: "stamp" } },
    ]);
    const signal = new AbortController().signal;
    expect(await readRemoteLastPushedAt(runtime, credentials, signal)).toEqual({
      ok: true,
      value: "stamp",
    });
    expect(calls[0]).toEqual({
      url: "https://worker.test/api/cloud-backup/backup/status",
      init: { headers: { Authorization: "Bearer owner" }, signal },
    });
  });

  it.each([null, {}, { lastPushedAt: 123 }])(
    "ignores untrusted timestamps: %j",
    async (body) => {
      const { runtime } = makeRuntime([{ ok: true, status: 200, body }]);
      expect(await readRemoteLastPushedAt(runtime, credentials)).toEqual({
        ok: true,
        value: null,
      });
    },
  );

  it("treats invalid status JSON as a missing guard timestamp", async () => {
    const { runtime } = makeRuntime();
    runtime.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error("Invalid JSON");
      },
    });
    expect(await readRemoteLastPushedAt(runtime, credentials)).toEqual({
      ok: true,
      value: null,
    });
  });

  it("reports an HTTP failure without treating it as a missing timestamp", async () => {
    const { runtime } = makeRuntime([{ ok: false, status: 404, body: null }]);
    expect(await readRemoteLastPushedAt(runtime, credentials)).toEqual({
      ok: false,
      error: "Request failed (404)",
      status: 404,
    });
  });

  it("can read status after disabling but refuses index reads", async () => {
    const { runtime, calls } = await enabled({
      ok: true,
      status: 200,
      body: { status: "idle", lastPushedAt: null, sizeBytes: 0 },
    });
    const record = (await runtime.storage.read("v-1")) as object;
    await runtime.storage.write("v-1", { ...record, enabled: false });
    expect((await getCloudBackupStatus(runtime, "v-1")).ok).toBe(true);
    expect(await fetchCloudBackupIndex(runtime, "v-1")).toEqual({
      ok: false,
      error: "Cloud backup is off.",
    });
    expect(calls).toHaveLength(1);
  });
});

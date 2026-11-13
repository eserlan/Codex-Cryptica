import { describe, expect, it, vi } from "vitest";
import {
  fetchCloudBackupAsset,
  restoreVaultFromCloudBackup,
} from "./backup-restore";
import { MANIFEST, makeRuntime } from "./test-helpers";

const credentials = { backupId: "backup", ownerCode: "owner" };

describe("backup restore", () => {
  it("downloads raw asset bytes with the ownership code", async () => {
    const { runtime } = makeRuntime();
    runtime.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([0, 127, 255]).buffer,
    });
    expect(
      await fetchCloudBackupAsset(runtime, credentials, "portrait.png"),
    ).toEqual({ ok: true, value: new Uint8Array([0, 127, 255]) });
    expect(runtime.fetch).toHaveBeenCalledWith(
      "https://worker.test/api/cloud-backup/backup/assets/portrait.png",
      { headers: { Authorization: "Bearer owner" } },
    );
    expect(await runtime.storage.list?.()).toEqual([]);
  });

  it("reports asset failures without modifying local storage", async () => {
    const { runtime } = makeRuntime([
      { ok: false, status: 404, body: { error: { message: "Not found" } } },
    ]);
    expect(
      await fetchCloudBackupAsset(runtime, credentials, "missing"),
    ).toEqual({ ok: false, error: "Not found", status: 404 });
    expect(await runtime.storage.list?.()).toEqual([]);
  });

  it("stages an empty bundle without requiring a local backup record", async () => {
    const { runtime } = makeRuntime([
      { ok: true, status: 200, body: { manifest: MANIFEST, bundle: null } },
    ]);
    expect(await restoreVaultFromCloudBackup(runtime, credentials)).toEqual({
      ok: true,
      value: { manifest: MANIFEST, bundle: null },
    });
  });

  it.each([null, { bundle: {} }, { manifest: MANIFEST }])(
    "rejects an incomplete restore: %j",
    async (body) => {
      const { runtime } = makeRuntime([{ ok: true, status: 200, body }]);
      expect(await restoreVaultFromCloudBackup(runtime, credentials)).toEqual({
        ok: false,
        error: "The backup could not be read.",
      });
    },
  );
});

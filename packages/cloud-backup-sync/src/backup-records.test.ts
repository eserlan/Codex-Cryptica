import { describe, expect, it, vi } from "vitest";
import {
  getCloudBackupOwnershipCode,
  getLocalCloudBackupRecord,
  listKnownCloudBackups,
} from "./backup-records";
import { createMemoryStorage, type CloudBackupRuntime } from "./runtime";

const record = {
  vaultId: "vault",
  backupId: "backup",
  ownerCode: "owner",
  enabled: true,
  status: "idle",
  lastPushedAt: null,
  consentedAt: "2026-08-31T12:00:00.000Z",
};

function runtime(): CloudBackupRuntime {
  return {
    baseUrl: "https://worker.test",
    fetch: vi.fn(),
    storage: createMemoryStorage(),
  };
}

describe("backup records", () => {
  it("reads a valid stored record and its ownership code without a request", async () => {
    const deps = runtime();
    await deps.storage.write("vault", record);
    expect(await getLocalCloudBackupRecord(deps, "vault")).toEqual(record);
    expect(await getCloudBackupOwnershipCode(deps, "vault")).toBe("owner");
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  it("treats a missing or malformed record as absent", async () => {
    const deps = runtime();
    expect(await getLocalCloudBackupRecord(deps, "vault")).toBeNull();
    await deps.storage.write("vault", { ...record, ownerCode: 123 });
    expect(await getLocalCloudBackupRecord(deps, "vault")).toBeNull();
    expect(await getCloudBackupOwnershipCode(deps, "vault")).toBeNull();
    expect(await listKnownCloudBackups(deps)).toEqual([]);
  });

  it("sorts known backups newest first, with never-pushed entries last", async () => {
    const deps = runtime();
    await deps.storage.write("vault", record);
    await deps.storage.write("newer", {
      ...record,
      vaultId: "newer",
      vaultTitle: "New",
      lastPushedAt: "2026-09-02T00:00:00.000Z",
    });
    await deps.storage.write("older", {
      ...record,
      vaultId: "older",
      lastPushedAt: "2026-09-01T00:00:00.000Z",
    });
    const known = await listKnownCloudBackups(deps);
    expect(known.map((backup) => backup.vaultId)).toEqual([
      "newer",
      "older",
      "vault",
    ]);
    expect(known[0].vaultTitle).toBe("New");
    expect(known[2].vaultTitle).toBeNull();
    expect(known[2].recoveryKey).toBe("backup:owner");
  });

  it("supports storage that cannot enumerate", async () => {
    const deps = runtime();
    delete deps.storage.list;
    expect(await listKnownCloudBackups(deps)).toEqual([]);
  });
});

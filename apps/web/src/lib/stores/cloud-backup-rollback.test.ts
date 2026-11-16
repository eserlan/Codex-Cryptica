import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  fetchCloudBackupRestorePoints: vi.fn(),
  rollBackCloudBackup: vi.fn(),
}));
vi.mock("@codex/cloud-backup-sync", () => api);

import { CloudBackupRollback } from "./cloud-backup-rollback.svelte";

const POINT = { date: "2026-11-01", revision: 4, entityCount: 9 };
const preview = (changed = 1, returning = 0, trashed = 0) => ({
  kind: "preview" as const,
  date: POINT.date,
  revision: 7,
  changed,
  returning,
  trashed,
});

function setup() {
  let active = "v-1";
  const afterRollback = vi.fn(async () => {});
  const notify = vi.fn();
  const store = new CloudBackupRollback(
    () => ({ runtime: {}, activeVaultId: () => active, notify }) as never,
    afterRollback,
  );
  return { store, afterRollback, notify, switchVault: () => (active = "v-2") };
}

beforeEach(() => {
  vi.resetAllMocks();
  api.fetchCloudBackupRestorePoints.mockResolvedValue({
    kind: "points",
    points: [POINT],
  });
});

describe("CloudBackupRollback", () => {
  it("loads the points and maps the other outcomes to a load state", async () => {
    const { store } = setup();
    await store.load("v-1");
    expect(store.loadState).toBe("ready");
    expect(store.points).toEqual([POINT]);
    api.fetchCloudBackupRestorePoints.mockResolvedValue({
      kind: "unsupported",
    });
    await store.load("v-1");
    expect(store.loadState).toBe("unsupported");
    api.fetchCloudBackupRestorePoints.mockResolvedValue({
      kind: "failed",
      error: "x",
    });
    await store.load("v-1");
    expect(store.loadState).toBe("failed");
    expect(store.points).toEqual([]);
  });

  it("returns the counts of a preview", async () => {
    const { store } = setup();
    api.rollBackCloudBackup.mockResolvedValue(preview(2, 1, 3));
    expect(await store.preview("v-1", POINT.date)).toMatchObject({
      revision: 7,
      changed: 2,
      returning: 1,
      trashed: 3,
    });
    expect(api.rollBackCloudBackup.mock.calls[0][2]).toEqual({
      date: POINT.date,
      dryRun: true,
    });
    expect(store.result).toBeNull();
  });

  it("says the vault already matches when every count is zero", async () => {
    const { store } = setup();
    api.rollBackCloudBackup.mockResolvedValue(preview(0, 0, 0));
    expect(await store.preview("v-1", POINT.date)).toBeNull();
    expect(store.result).toEqual({ outcome: "matches", date: POINT.date });
  });

  it("pulls after a rollback succeeds and reloads the list", async () => {
    const { store, afterRollback } = setup();
    api.rollBackCloudBackup.mockResolvedValue({
      kind: "rolledBack",
      counts: { changed: 1, returning: 0, trashed: 0 },
    });
    await store.rollBack("v-1", POINT.date, 7);
    expect(api.rollBackCloudBackup.mock.calls[0][2]).toEqual({
      date: POINT.date,
      baseRevision: 7,
    });
    expect(afterRollback).toHaveBeenCalledWith("v-1");
    expect(store.result).toEqual({ outcome: "rolledBack", date: POINT.date });
    expect(api.fetchCloudBackupRestorePoints).toHaveBeenCalledTimes(1);
    expect(store.busyDate).toBeNull();
  });

  it("does not pull after a changed or failed outcome", async () => {
    const { store, afterRollback } = setup();
    api.rollBackCloudBackup.mockResolvedValue({ kind: "changed" });
    await store.rollBack("v-1", POINT.date, 7);
    expect(store.result?.outcome).toBe("changed");
    api.rollBackCloudBackup.mockResolvedValue({ kind: "failed", error: "x" });
    await store.rollBack("v-1", POINT.date, 7);
    expect(store.result?.outcome).toBe("failed");
    api.rollBackCloudBackup.mockResolvedValue({ kind: "unsupported" });
    await store.rollBack("v-1", POINT.date, 7);
    expect(store.result?.outcome).toBe("failed");
    expect(afterRollback).not.toHaveBeenCalled();
  });

  it("reloads the list when the point is gone", async () => {
    const { store } = setup();
    api.rollBackCloudBackup.mockResolvedValue({ kind: "gone" });
    await store.rollBack("v-1", POINT.date, 7);
    expect(store.result?.outcome).toBe("gone");
    expect(api.fetchCloudBackupRestorePoints).toHaveBeenCalledTimes(1);
  });

  it("ignores results for a vault that is no longer active", async () => {
    const { store, afterRollback, switchVault } = setup();
    api.rollBackCloudBackup.mockImplementation(async () => {
      switchVault();
      return {
        kind: "rolledBack",
        counts: { changed: 1, returning: 0, trashed: 0 },
      };
    });
    await store.rollBack("v-1", POINT.date, 7);
    expect(store.result).toBeNull();
    expect(afterRollback).not.toHaveBeenCalled();

    const other = setup();
    api.fetchCloudBackupRestorePoints.mockImplementation(async () => {
      other.switchVault();
      return { kind: "points", points: [POINT] };
    });
    await other.store.load("v-1");
    expect(other.store.points).toEqual([]);
  });

  it("notifies and retains trashEvicted on result when rollback evicts trash", async () => {
    const { store, notify } = setup();
    const evicted = {
      evictedCount: 4,
      usedBytes: 49 * 1024 * 1024,
      maxBytes: 50 * 1024 * 1024,
    };
    api.rollBackCloudBackup.mockResolvedValue({
      kind: "rolledBack",
      counts: { changed: 1, returning: 0, trashed: 5 },
      trashEvicted: evicted,
    });
    await store.rollBack("v-1", POINT.date, 7);
    expect(store.result).toEqual({
      outcome: "rolledBack",
      date: POINT.date,
      trashEvicted: evicted,
    });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0]).toContain("50 MB");
    expect(notify.mock.calls[0][0]).toContain("4 older deleted items");
  });
});

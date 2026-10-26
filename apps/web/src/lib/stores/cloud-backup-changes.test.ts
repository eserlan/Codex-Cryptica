import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchCloudBackupIndex,
  getLocalCloudBackupRecord,
} from "@codex/cloud-backup-sync";
import { hashCloudBackupEntity } from "schema";
import { CloudBackupChanges } from "./cloud-backup-changes";
import {
  CloudBackupDirtyStore,
  memoryDirtyStorage,
} from "./cloud-backup-dirty";
import { createInertRuntime } from "./cloud-backup-runtime";
import type { CloudBackupDeps } from "./cloud-backup-types";

vi.mock("@codex/cloud-backup-sync", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchCloudBackupIndex: vi.fn(),
  getLocalCloudBackupRecord: vi.fn(),
}));
function harness() {
  const state: ConstructorParameters<typeof CloudBackupChanges>[0] = {
    status: "idle",
  };
  const deps: CloudBackupDeps = {
    runtime: createInertRuntime(),
    buildPayload: vi.fn(),
    activeVaultId: () => "vault",
    dirty: new CloudBackupDirtyStore(memoryDirtyStorage()),
    listLocalEntities: () => [],
    reconcileDelayMs: 10,
  };
  const notify = vi.fn();
  const enabling = { id: null as string | null };
  const changes = new CloudBackupChanges(
    state,
    () => deps,
    notify,
    () => enabling.id,
  );
  return { changes, deps, state, notify, enabling };
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});
afterEach(() => vi.useRealTimers());

describe("cloud backup change tracking", () => {
  it("compares loaded hashes, adds missing rows and deletes remote-only rows", async () => {
    const { changes, deps, notify } = harness();
    const same = { id: "same" };
    deps.listLocalEntities = () => [
      { id: "same", loaded: true, entity: same },
      { id: "stale", loaded: true, entity: {} },
      { id: "unloaded", loaded: false, entity: {} },
      { id: "missing", loaded: false, entity: {} },
    ];
    vi.mocked(fetchCloudBackupIndex).mockResolvedValueOnce({
      ok: true,
      value: {
        same: await hashCloudBackupEntity(same),
        stale: "old",
        unloaded: "old",
        extra: "old",
      },
    });
    expect(await changes.reconcileWithRemote("vault")).toBe(3);
    expect(
      (await deps.dirty!.snapshot("vault"))
        .map((row) => [row.id, Boolean(row.deleted)])
        .sort(),
    ).toEqual([
      ["extra", true],
      ["missing", false],
      ["stale", false],
    ]);
    expect(notify).toHaveBeenCalledWith("vault");
  });

  it("does not record a failed or disabled consistency check", async () => {
    const { changes, deps, state, notify } = harness();
    vi.mocked(fetchCloudBackupIndex).mockResolvedValueOnce({
      ok: false,
      error: "Network",
    });
    expect(await changes.reconcileWithRemote("vault")).toBe(0);
    state.status = "off";
    vi.mocked(fetchCloudBackupIndex).mockResolvedValueOnce({
      ok: true,
      value: { extra: "hash" },
    });
    expect(await changes.reconcileWithRemote("vault")).toBe(0);
    expect(await deps.dirty!.snapshot("vault")).toEqual([]);
    expect(notify).not.toHaveBeenCalled();
  });

  it("schedules one consistency check and cancels it on teardown", async () => {
    const { changes } = harness();
    vi.mocked(fetchCloudBackupIndex).mockResolvedValue({ ok: true, value: {} });
    changes.schedule("vault");
    changes.schedule("vault");
    await vi.advanceTimersByTimeAsync(10);
    expect(fetchCloudBackupIndex).toHaveBeenCalledTimes(1);
    changes.schedule("vault");
    changes.clearTimer();
    await vi.advanceTimersByTimeAsync(100);
    expect(fetchCloudBackupIndex).toHaveBeenCalledTimes(1);
  });

  it("tracks changes during enable while keeping off vaults silent", async () => {
    const { changes, deps, notify, enabling } = harness();
    vi.mocked(getLocalCloudBackupRecord).mockResolvedValue(null);
    await changes.recordLocalChange("vault", { kind: "entity", ids: ["off"] });
    expect(await deps.dirty!.snapshot("vault")).toEqual([]);
    expect(notify).not.toHaveBeenCalled();
    enabling.id = "vault";
    await changes.recordLocalChange(
      "vault",
      { kind: "entity", ids: ["first"] },
      { schedule: false },
    );
    expect(await deps.dirty!.snapshot("vault")).toHaveLength(1);
    expect(notify).not.toHaveBeenCalled();
    await changes.recordLocalChange("vault", { kind: "entity", ids: ["next"] });
    expect(notify).toHaveBeenCalledWith("vault");
  });

  it("does not reject an already-completed local save if tracking fails", async () => {
    const { changes, notify } = harness();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(getLocalCloudBackupRecord).mockRejectedValueOnce(
      new Error("Storage"),
    );
    await expect(changes.recordLocalChange("vault")).resolves.toBeUndefined();
    expect(notify).toHaveBeenCalledWith("vault");
    vi.restoreAllMocks();
  });
});

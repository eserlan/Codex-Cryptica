import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  attachCloudBackup,
  deleteCloudBackup,
  enableCloudBackup,
  getCloudBackupOwnershipCode,
  getLocalCloudBackupRecord,
  listKnownCloudBackups,
} from "@codex/cloud-backup-sync";
import { CloudBackupAccount } from "./cloud-backup-account";
import { createInertRuntime } from "./cloud-backup-runtime";
import {
  CloudBackupDirtyStore,
  memoryDirtyStorage,
} from "./cloud-backup-dirty";
import type { CloudBackupDeps } from "./cloud-backup-types";

vi.mock("@codex/cloud-backup-sync", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  attachCloudBackup: vi.fn(),
  deleteCloudBackup: vi.fn(),
  enableCloudBackup: vi.fn(),
  getCloudBackupOwnershipCode: vi.fn(),
  getLocalCloudBackupRecord: vi.fn(),
  listKnownCloudBackups: vi.fn(),
}));
const record = {
  enabled: true,
  backupId: "backup",
  ownerCode: "code",
  lastPushedAt: "stamp",
  status: "idle",
} as NonNullable<Awaited<ReturnType<typeof getLocalCloudBackupRecord>>>;
function harness() {
  const state: ConstructorParameters<typeof CloudBackupAccount>[0] = {
    consented: false,
    ownerCode: null,
    lastPushedAt: null,
    status: "off",
    errorMessage: null,
    knownBackups: [],
    recoveryKey: null,
  };
  const deps: CloudBackupDeps = {
    runtime: createInertRuntime(),
    activeVaultId: () => "vault",
    buildPayload: vi.fn(async () => ({ vaultTitle: "Vault", bundle: {} })),
    dirty: new CloudBackupDirtyStore(memoryDirtyStorage()),
  };
  const attached = vi.fn();
  return {
    state,
    deps,
    attached,
    account: new CloudBackupAccount(state, () => deps, attached),
  };
}
beforeEach(() => vi.clearAllMocks());

describe("cloud backup account", () => {
  it("applies consent and status from enabled, disabled and absent records", () => {
    const { account, state } = harness();
    account.applyRecord(record);
    expect(state).toMatchObject({
      consented: true,
      status: "idle",
      ownerCode: "code",
      lastPushedAt: "stamp",
    });
    account.applyRecord({ ...record, enabled: false });
    expect(state).toMatchObject({ consented: true, status: "off" });
    account.applyRecord(null);
    expect(state).toMatchObject({
      consented: false,
      status: "off",
      ownerCode: null,
      lastPushedAt: null,
    });
  });

  it("tracks the vault being enabled until the initial build completes", async () => {
    const { account, state, deps } = harness();
    vi.mocked(deps.buildPayload).mockImplementationOnce(async () => {
      expect(account.enablingVaultId).toBe("vault");
      return { vaultTitle: "Vault", bundle: {} };
    });
    vi.mocked(enableCloudBackup).mockResolvedValueOnce({
      ok: true,
      value: record,
    });
    expect(await account.enable("vault")).toBe(true);
    expect(account.enablingVaultId).toBeNull();
    expect(state.status).toBe("idle");
    vi.mocked(deps.buildPayload).mockRejectedValueOnce(new Error("Unreadable"));
    expect(await account.enable("vault")).toBe(false);
    expect(account.enablingVaultId).toBeNull();
    expect(state.errorMessage).toBe("Unreadable");
  });

  it("persists the full-push marker before attaching and resetting caches", async () => {
    const { account, deps, attached, state } = harness();
    vi.mocked(attachCloudBackup).mockImplementationOnce(async () => {
      expect(await deps.dirty!.snapshot("vault")).toMatchObject([
        { kind: "full" },
      ]);
      expect(attached).not.toHaveBeenCalled();
      return { ok: true, value: record };
    });
    expect(
      await account.attachToExistingBackup("vault", "backup", "code", "Title"),
    ).toBe(true);
    expect(attachCloudBackup).toHaveBeenCalledWith(
      deps.runtime,
      "vault",
      { backupId: "backup", ownerCode: "code" },
      { vaultTitle: "Title" },
    );
    expect(attached).toHaveBeenCalledWith("vault");
    expect(state.status).toBe("idle");
  });

  it("does not attach when marking changes fails", async () => {
    const { account, deps, attached, state } = harness();
    vi.spyOn(deps.dirty!, "requireFullPush").mockRejectedValueOnce(
      new Error("Storage"),
    );
    expect(
      await account.attachToExistingBackup("vault", "backup", "code"),
    ).toBe(false);
    expect(attachCloudBackup).not.toHaveBeenCalled();
    expect(attached).not.toHaveBeenCalled();
    expect(state.errorMessage).toBe("Storage");
  });

  it("preserves the account on failed deletion and clears it after success", async () => {
    const { account, state } = harness();
    account.applyRecord(record);
    vi.mocked(deleteCloudBackup).mockResolvedValueOnce({
      ok: false,
      error: "Offline",
    });
    expect(await account.deleteBackup("vault")).toBe(false);
    expect(state.ownerCode).toBe("code");
    vi.mocked(deleteCloudBackup).mockResolvedValueOnce({
      ok: true,
      value: null,
    });
    expect(await account.deleteBackup("vault")).toBe(true);
    expect(state.consented).toBe(false);
  });

  it("reveals recovery credentials and handles missing ownership", async () => {
    const { account, state } = harness();
    vi.mocked(getLocalCloudBackupRecord).mockResolvedValue(record);
    vi.mocked(getCloudBackupOwnershipCode).mockResolvedValueOnce("code");
    expect(await account.revealRecoveryKey("vault")).toBe("backup:code");
    expect(state.recoveryKey).toBe("backup:code");
    vi.mocked(getCloudBackupOwnershipCode).mockResolvedValueOnce(null);
    expect(await account.revealRecoveryKey("vault")).toBeNull();
    vi.mocked(listKnownCloudBackups).mockResolvedValueOnce([]);
    await account.loadKnownBackups();
    expect(state.knownBackups).toEqual([]);
  });
});

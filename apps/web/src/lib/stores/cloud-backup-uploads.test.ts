import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getLocalCloudBackupRecord,
  pushDeltaToCloudBackup,
  pushVaultToCloudBackup,
} from "@codex/cloud-backup-sync";
import { CloudBackupUploads } from "./cloud-backup-uploads";
import { createInertRuntime } from "./cloud-backup-runtime";
import type { CloudBackupDeps } from "./cloud-backup-types";
import {
  CloudBackupDirtyStore,
  memoryDirtyStorage,
} from "./cloud-backup-dirty";

vi.mock("@codex/cloud-backup-sync", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getLocalCloudBackupRecord: vi.fn(),
  pushDeltaToCloudBackup: vi.fn(),
  pushVaultToCloudBackup: vi.fn(),
}));

const record = { enabled: true, lastPushedAt: "previous" } as NonNullable<
  Awaited<ReturnType<typeof getLocalCloudBackupRecord>>
>;
function harness() {
  const state: ConstructorParameters<typeof CloudBackupUploads>[0] = {
    lastPushedAt: "previous",
    skippedAssets: [],
    skippedEntities: [],
    uploadProgress: null,
  };
  const deps: CloudBackupDeps = {
    runtime: createInertRuntime(),
    buildPayload: vi.fn(async () => ({
      vaultTitle: "Vault",
      bundle: {},
      skippedAssets: ["missing"],
    })),
    activeVaultId: () => "vault",
    dirty: new CloudBackupDirtyStore(memoryDirtyStorage()),
    storage: { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() },
  };
  return { state, deps, uploads: new CloudBackupUploads(state, () => deps) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getLocalCloudBackupRecord).mockResolvedValue(record);
  vi.mocked(pushVaultToCloudBackup).mockResolvedValue({
    ok: true,
    value: {
      schemaVersion: 1,
      backupId: "backup",
      vaultTitle: "Vault",
      sizeBytes: 0,
      createdAt: "previous",
      lastPushedAt: "new",
    },
  });
});

describe("cloud backup uploads", () => {
  it("updates full-upload state and clears only versions sent", async () => {
    const { deps, uploads, state } = harness();
    await deps.dirty!.record("vault", { kind: "entity", ids: ["edited"] });
    vi.mocked(deps.buildPayload).mockImplementationOnce(async () => {
      await deps.dirty!.record("vault", { kind: "entity", ids: ["edited"] });
      return { vaultTitle: "Vault", bundle: {}, skippedAssets: ["missing"] };
    });
    expect(await uploads.pushSnapshot("vault", { guarded: false })).toEqual({
      ok: true,
    });
    expect(state.lastPushedAt).toBe("new");
    expect(state.skippedAssets).toEqual(["missing"]);
    expect(await deps.dirty!.snapshot("vault")).toHaveLength(1);
    expect(pushVaultToCloudBackup).toHaveBeenCalledWith(
      deps.runtime,
      "vault",
      expect.any(Object),
      expect.any(Function),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("does not build or upload when the record is off", async () => {
    const { deps, uploads } = harness();
    vi.mocked(getLocalCloudBackupRecord).mockResolvedValueOnce(null);
    expect(
      await uploads.pushSnapshot("vault", { guarded: true }),
    ).toMatchObject({ notEnabled: true });
    expect(deps.buildPayload).not.toHaveBeenCalled();
    expect(pushVaultToCloudBackup).not.toHaveBeenCalled();
  });

  it("aborts a suspended build and waits for it to settle", async () => {
    const { deps, uploads } = harness();
    let signal: AbortSignal | undefined;
    let release!: () => void;
    const building = Promise.withResolvers<void>();
    vi.mocked(deps.buildPayload).mockImplementationOnce(
      async (_vaultId, buildSignal) => {
        signal = buildSignal;
        building.resolve();
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return { vaultTitle: "Vault", bundle: {} };
      },
    );
    const saving = uploads.pushSnapshot("vault", { guarded: false });
    await building.promise;
    const cancelling = uploads.cancel();
    expect(signal?.aborted).toBe(true);
    release();
    await cancelling;
    expect(await saving).toMatchObject({ notEnabled: true });
    expect(pushVaultToCloudBackup).not.toHaveBeenCalled();
  });

  it("falls back from an unsupported delta and retains conflict details", async () => {
    const { deps, uploads } = harness();
    deps.buildDelta = vi.fn(async () => ({
      vaultTitle: "Vault",
      upserts: [],
      deletes: [],
      assetIds: [],
    }));
    await deps.dirty!.record("vault", { kind: "entity", ids: ["edited"] });
    vi.mocked(pushDeltaToCloudBackup).mockResolvedValueOnce({
      ok: false,
      fullPushRequired: true,
      error: "Full required",
    });
    expect(await uploads.pushSnapshot("vault", { guarded: true })).toEqual({
      ok: true,
    });
    expect(pushVaultToCloudBackup).toHaveBeenCalledTimes(1);
    await deps.dirty!.record("vault", { kind: "entity", ids: ["edited"] });
    vi.mocked(pushDeltaToCloudBackup).mockResolvedValueOnce({
      ok: false,
      conflict: true,
      remoteLastPushedAt: "remote",
      error: "Newer copy",
    });
    expect(await uploads.pushSnapshot("vault", { guarded: true })).toEqual({
      ok: false,
      conflict: true,
      remoteAt: "remote",
      error: "Newer copy",
    });
    expect(await deps.dirty!.snapshot("vault")).toHaveLength(1);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CloudBackupSync } from "./cloud-backup-sync";
import { createInertRuntime } from "./cloud-backup-runtime";
import type { CloudBackupDeps, SnapshotOutcome } from "./cloud-backup-types";

const online = vi.hoisted(() => ({ current: true }));
vi.mock("./online.svelte", () => ({ onlineStatus: online }));
function harness() {
  const state: ConstructorParameters<typeof CloudBackupSync>[0] = {
    status: "idle",
    errorMessage: null,
    autoState: "idle",
    autoConflictRemoteAt: null,
    uploadProgress: null,
  };
  const deps: CloudBackupDeps = {
    runtime: createInertRuntime(),
    buildPayload: vi.fn(),
    activeVaultId: () => "vault",
    debounceMs: 10,
    retryMs: 20,
  };
  const uploads = {
    pushing: false,
    pushSnapshot: vi.fn(async (): Promise<SnapshotOutcome> => ({ ok: true })),
  };
  const sync = new CloudBackupSync(state, () => deps, uploads);
  return { state, deps, uploads, sync };
}
beforeEach(() => {
  vi.useFakeTimers();
  online.current = true;
});
afterEach(() => vi.useRealTimers());

describe("cloud backup sync orchestration", () => {
  it("debounces edits and performs a guarded automatic save", async () => {
    const { sync, state, uploads } = harness();
    sync.notifyLocalChange("vault");
    await vi.advanceTimersByTimeAsync(5);
    sync.notifyLocalChange("vault");
    await vi.advanceTimersByTimeAsync(5);
    expect(uploads.pushSnapshot).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5);
    expect(uploads.pushSnapshot).toHaveBeenCalledWith("vault", {
      guarded: true,
    });
    expect(state.autoState).toBe("saved");
  });

  it("waits offline and flushes on reconnect through idempotent listeners", async () => {
    const { sync, state, uploads } = harness();
    online.current = false;
    sync.startAutoSyncListeners();
    sync.startAutoSyncListeners();
    try {
      sync.notifyLocalChange();
      await vi.advanceTimersByTimeAsync(10);
      expect(state.autoState).toBe("offline");
      expect(uploads.pushSnapshot).not.toHaveBeenCalled();
      online.current = true;
      window.dispatchEvent(new Event("online"));
      await vi.advanceTimersByTimeAsync(0);
      expect(uploads.pushSnapshot).toHaveBeenCalledTimes(1);
    } finally {
      sync.stopAutoSyncListeners();
    }
    sync.notifyLocalChange();
    sync.clearTimer();
    window.dispatchEvent(new Event("pagehide"));
    expect(uploads.pushSnapshot).toHaveBeenCalledTimes(1);
  });

  it("retries ordinary failures with backoff and stops when reset", async () => {
    const { sync, state, uploads } = harness();
    uploads.pushSnapshot.mockResolvedValueOnce({ ok: false, error: "Failed" });
    expect(await sync.flushAutoSync()).toBe(false);
    expect(state.autoState).toBe("retrying");
    await vi.advanceTimersByTimeAsync(19);
    expect(uploads.pushSnapshot).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(state.autoState).toBe("saved");
    sync.notifyLocalChange();
    sync.reset();
    await vi.advanceTimersByTimeAsync(100);
    expect(uploads.pushSnapshot).toHaveBeenCalledTimes(2);
  });

  it("pauses on conflicts and resumes after an explicit full save", async () => {
    const { sync, state, uploads } = harness();
    uploads.pushSnapshot.mockResolvedValueOnce({
      ok: false,
      conflict: true,
      remoteAt: "remote",
      error: "Conflict",
    });
    expect(await sync.flushAutoSync()).toBe(false);
    sync.notifyLocalChange();
    await vi.advanceTimersByTimeAsync(100);
    expect(uploads.pushSnapshot).toHaveBeenCalledTimes(1);
    expect(state.autoConflictRemoteAt).toBe("remote");
    expect(await sync.resolveConflictKeepMine()).toBe(true);
    expect(uploads.pushSnapshot).toHaveBeenLastCalledWith("vault", {
      guarded: false,
    });
    expect(state.autoConflictRemoteAt).toBeNull();
  });

  it("keeps manual saves unguarded and preserves idle automation state", async () => {
    const { sync, state, uploads } = harness();
    expect(await sync.backUpNow()).toBe(true);
    expect(state.autoState).toBe("idle");
    expect(uploads.pushSnapshot).toHaveBeenCalledWith("vault", {
      guarded: false,
    });
  });

  it("surfaces manual failures and exceptions, and always releases the lock", async () => {
    const { sync, state, uploads } = harness();
    uploads.pushSnapshot.mockResolvedValueOnce({ ok: false, error: "Failed" });
    expect(await sync.backUpNow()).toBe(false);
    expect(state.errorMessage).toBe("Failed");
    uploads.pushSnapshot.mockRejectedValueOnce(new Error("Read failed"));
    expect(await sync.backUpNow()).toBe(false);
    expect(state.errorMessage).toBe("Read failed");
    expect(state.status).toBe("error");
    expect(uploads.pushing).toBe(false);
  });

  it("preserves a queued save when only association state resets", async () => {
    const { sync, state, uploads } = harness();
    sync.notifyLocalChange();
    sync.resetState();
    expect(state.autoState).toBe("idle");
    await vi.advanceTimersByTimeAsync(10);
    expect(uploads.pushSnapshot).toHaveBeenCalledWith("vault", {
      guarded: true,
    });
    expect(state.autoState).toBe("saved");
  });

  it("stops automatic and manual saves cleanly for a disabled record", async () => {
    const { sync, state, uploads } = harness();
    uploads.pushSnapshot.mockResolvedValue({ ok: false, notEnabled: true });
    expect(await sync.backUpNow()).toBe(false);
    expect(state.status).toBe("off");
    state.status = "idle";
    expect(await sync.flushAutoSync()).toBe(false);
    await vi.advanceTimersByTimeAsync(100);
    expect(state.autoState).toBe("idle");
    expect(uploads.pushSnapshot).toHaveBeenCalledTimes(2);
  });
});

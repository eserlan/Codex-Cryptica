import { describe, expect, it, vi } from "vitest";
import { SearchProgressCoordinator } from "./search-progress-coordinator";

function makeCoordinator(
  onScheduledSave = vi.fn().mockResolvedValue(undefined),
) {
  const debug = { log: vi.fn(), warn: vi.fn(), error: vi.fn() } as any;
  const timers = {
    setTimeout: vi.fn().mockReturnValue(1),
    clearTimeout: vi.fn(),
  };
  const windowRef = {} as Window;

  const coordinator = new SearchProgressCoordinator({
    debug,
    timers: timers as any,
    windowRef,
    onScheduledSave,
  });

  return { coordinator, debug, timers, onScheduledSave };
}

describe("SearchProgressCoordinator — initial state", () => {
  it("starts idle", () => {
    const { coordinator } = makeCoordinator();
    expect(coordinator.getIndexProgress()).toEqual(
      expect.objectContaining({ status: "idle", isPartial: false }),
    );
  });

  it("has no active vault or run on construction", () => {
    const { coordinator } = makeCoordinator();
    expect(coordinator.activeVaultId).toBeNull();
    expect(coordinator.activeRunId).toBeNull();
  });
});

describe("SearchProgressCoordinator — run ID lifecycle", () => {
  it("createRunId sets activeRunId and returns it", () => {
    const { coordinator } = makeCoordinator();
    const runId = coordinator.createRunId("vault-1");
    expect(coordinator.activeRunId).toBe(runId);
    expect(runId).toContain("vault-1");
  });

  it("isActiveRun returns true when both vault and run match", () => {
    const { coordinator } = makeCoordinator();
    coordinator.activeVaultId = "vault-1";
    const runId = coordinator.createRunId("vault-1");
    expect(coordinator.isActiveRun("vault-1", runId)).toBe(true);
  });

  it("isActiveRun returns false when vault does not match", () => {
    const { coordinator } = makeCoordinator();
    coordinator.activeVaultId = "vault-2";
    const runId = coordinator.createRunId("vault-1");
    expect(coordinator.isActiveRun("vault-1", runId)).toBe(false);
  });

  it("isActiveRun returns false when runId is stale", () => {
    const { coordinator } = makeCoordinator();
    coordinator.activeVaultId = "vault-1";
    coordinator.createRunId("vault-1");
    const staleRunId = "vault-1:0:0";
    expect(coordinator.isActiveRun("vault-1", staleRunId)).toBe(false);
  });

  it("each createRunId call produces a unique run ID", () => {
    const { coordinator } = makeCoordinator();
    const a = coordinator.createRunId("vault-1");
    const b = coordinator.createRunId("vault-1");
    expect(a).not.toBe(b);
  });
});

describe("SearchProgressCoordinator — emitProgress and listeners", () => {
  it("notifies all registered listeners on emitProgress", () => {
    const { coordinator } = makeCoordinator();
    const listenerA = vi.fn();
    const listenerB = vi.fn();
    coordinator.subscribeIndexProgress(listenerA);
    coordinator.subscribeIndexProgress(listenerB);

    coordinator.emitProgress({
      status: "rebuilding",
      vaultId: "vault-1",
      runId: "r1",
      indexedCount: 0,
      totalCount: 10,
      isPartial: true,
      canRetry: false,
      message: "Indexing.",
      error: null,
    });

    expect(listenerA).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "rebuilding" }),
    );
    expect(listenerB).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "rebuilding" }),
    );
  });

  it("subscribeIndexProgress fires immediately with current progress", () => {
    const { coordinator } = makeCoordinator();
    const listener = vi.fn();
    coordinator.subscribeIndexProgress(listener);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ status: "idle" }),
    );
  });

  it("unsubscribe stops future notifications", () => {
    const { coordinator } = makeCoordinator();
    const listener = vi.fn();
    const unsubscribe = coordinator.subscribeIndexProgress(listener);
    unsubscribe();
    listener.mockClear();

    coordinator.emitProgress({
      status: "ready",
      vaultId: "v",
      runId: "r",
      indexedCount: 5,
      totalCount: 5,
      isPartial: false,
      canRetry: false,
      message: "Ready.",
      error: null,
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it("a throwing listener does not prevent other listeners from being notified", () => {
    const { coordinator } = makeCoordinator();
    const bad = vi.fn();
    const good = vi.fn();
    coordinator.subscribeIndexProgress(bad);
    coordinator.subscribeIndexProgress(good);
    bad.mockClear();
    good.mockClear();
    bad.mockImplementation(() => {
      throw new Error("boom");
    });

    coordinator.emitProgress({
      status: "ready",
      vaultId: "v",
      runId: "r",
      indexedCount: 1,
      totalCount: 1,
      isPartial: false,
      canRetry: false,
      message: "Ready.",
      error: null,
    });

    expect(good).toHaveBeenCalled();
  });

  it("getIndexProgress returns a snapshot — mutations do not affect internal state", () => {
    const { coordinator } = makeCoordinator();
    const snapshot = coordinator.getIndexProgress();
    (snapshot as any).status = "hacked";
    expect(coordinator.getIndexProgress().status).toBe("idle");
  });
});

describe("SearchProgressCoordinator — cancelIndexing", () => {
  it("transitions to cancelled and clears activeRunId", async () => {
    const { coordinator } = makeCoordinator();
    coordinator.activeVaultId = "vault-1";
    coordinator.createRunId("vault-1");

    await coordinator.cancelIndexing("Switched.");

    expect(coordinator.getIndexProgress()).toEqual(
      expect.objectContaining({ status: "cancelled", canRetry: true }),
    );
    expect(coordinator.activeRunId).toBeNull();
  });

  it("is a no-op when there is no active run", async () => {
    const { coordinator } = makeCoordinator();
    const listener = vi.fn();
    coordinator.subscribeIndexProgress(listener);
    listener.mockClear();

    await coordinator.cancelIndexing();

    expect(listener).not.toHaveBeenCalled();
  });

  it("respects the canRetry flag", async () => {
    const { coordinator } = makeCoordinator();
    coordinator.activeVaultId = "vault-1";
    coordinator.createRunId("vault-1");

    await coordinator.cancelIndexing("Vault switched.", false);

    expect(coordinator.getIndexProgress().canRetry).toBe(false);
  });
});

describe("SearchProgressCoordinator — failIndexing", () => {
  it("transitions to failed with canRetry: true", () => {
    const { coordinator } = makeCoordinator();
    coordinator.activeVaultId = "vault-1";
    const runId = coordinator.createRunId("vault-1");

    coordinator.failIndexing("vault-1", runId, new Error("worker crashed"));

    expect(coordinator.getIndexProgress()).toEqual(
      expect.objectContaining({
        status: "failed",
        canRetry: true,
        error: "worker crashed",
      }),
    );
  });

  it("is a no-op when the run is stale", () => {
    const { coordinator } = makeCoordinator();
    coordinator.activeVaultId = "vault-1";
    coordinator.createRunId("vault-1");

    coordinator.failIndexing("vault-1", "stale-run-id", new Error("nope"));

    expect(coordinator.getIndexProgress().status).toBe("idle");
  });
});

describe("SearchProgressCoordinator — scheduleAutoSave", () => {
  it("schedules the save callback after the debounce delay", () => {
    const onScheduledSave = vi.fn().mockResolvedValue(undefined);
    const { coordinator, timers } = makeCoordinator(onScheduledSave);
    coordinator.activeVaultId = "vault-1";
    coordinator.isDirty = true;

    coordinator.scheduleAutoSave();

    expect(timers.setTimeout).toHaveBeenCalledWith(expect.any(Function), 2000);
    // Simulate timer firing
    const timerFn = (timers.setTimeout as any).mock.calls[0][0];
    timerFn();
    expect(onScheduledSave).toHaveBeenCalledWith("vault-1");
  });

  it("suppresses save when progress is partial", () => {
    const onScheduledSave = vi.fn().mockResolvedValue(undefined);
    const { coordinator, timers } = makeCoordinator(onScheduledSave);
    coordinator.activeVaultId = "vault-1";
    coordinator.isDirty = true;
    coordinator.emitProgress({
      status: "partial",
      vaultId: "vault-1",
      runId: "r",
      indexedCount: 5,
      totalCount: 10,
      isPartial: true,
      canRetry: false,
      message: "Partial.",
      error: null,
    });

    coordinator.scheduleAutoSave();

    expect(timers.setTimeout).not.toHaveBeenCalled();
  });

  it("suppresses save while status is rebuilding", () => {
    const onScheduledSave = vi.fn().mockResolvedValue(undefined);
    const { coordinator, timers } = makeCoordinator(onScheduledSave);
    coordinator.activeVaultId = "vault-1";
    coordinator.isDirty = true;
    coordinator.emitProgress({
      status: "rebuilding",
      vaultId: "vault-1",
      runId: "r",
      indexedCount: 0,
      totalCount: 5,
      isPartial: true,
      canRetry: false,
      message: "Rebuilding.",
      error: null,
    });

    coordinator.scheduleAutoSave();

    expect(timers.setTimeout).not.toHaveBeenCalled();
  });

  it("does not trigger save when index is not dirty", () => {
    const onScheduledSave = vi.fn().mockResolvedValue(undefined);
    const { coordinator, timers } = makeCoordinator(onScheduledSave);
    coordinator.activeVaultId = "vault-1";
    coordinator.isDirty = false;

    coordinator.scheduleAutoSave();

    const timerFn = (timers.setTimeout as any).mock.calls[0]?.[0];
    if (timerFn) timerFn();
    expect(onScheduledSave).not.toHaveBeenCalled();
  });

  it("skips scheduling when windowRef is absent", () => {
    const onScheduledSave = vi.fn().mockResolvedValue(undefined);
    const debug = { log: vi.fn(), warn: vi.fn(), error: vi.fn() } as any;
    const timers = { setTimeout: vi.fn(), clearTimeout: vi.fn() };
    const coordinator = new SearchProgressCoordinator({
      debug,
      timers: timers as any,
      windowRef: undefined,
      onScheduledSave,
    });
    coordinator.activeVaultId = "vault-1";
    coordinator.isDirty = true;

    coordinator.scheduleAutoSave();

    expect(timers.setTimeout).not.toHaveBeenCalled();
  });

  it("debounces by clearing a pending timeout before scheduling a new one", () => {
    const { coordinator, timers } = makeCoordinator();
    coordinator.activeVaultId = "vault-1";
    coordinator.isDirty = true;

    coordinator.scheduleAutoSave();
    coordinator.scheduleAutoSave();

    expect(timers.clearTimeout).toHaveBeenCalledWith(1);
    expect(timers.setTimeout).toHaveBeenCalledTimes(2);
  });
});

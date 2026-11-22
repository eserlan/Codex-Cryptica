import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  (global as any).$state = (v: any) => v;
  (global as any).$state.raw = (v: any) => v;
});

import {
  DEFAULT_BOOT_WATCHDOG_MS,
  VaultBootDiagnostics,
  classifyBootError,
} from "./boot-diagnostics.svelte";

describe("VaultBootDiagnostics", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("tracks stage progression, durations, and coarse counts with zero PII", () => {
    let now = 1000;
    const warn = vi.fn();
    const diag = new VaultBootDiagnostics({
      clock: { now: () => now },
      warn,
    });

    const attemptId = diag.startAttempt();
    expect(diag.status).toBe("booting");
    expect(diag.activePhase).toBe("boot_started");
    expect(diag.attemptCount).toBe(1);
    expect(diag.stageDurationsMs.boot_started).toBe(0);

    now += 25;
    diag.setCounts({ vaultCount: 3 });
    diag.recordStage("registry_ready", attemptId);
    expect(diag.stageDurationsMs.registry_ready).toBe(25);
    expect(diag.activePhase).toBe("registry_ready");

    now += 40;
    diag.recordStage("migration_ready", attemptId);
    diag.setCacheState("warm");
    diag.setCounts({ entityCount: 42 });
    diag.recordStage("vault_cache_ready", attemptId);
    diag.markDegraded("theme");
    // Unrecognized arbitrary strings (e.g. a vault name or path) are ignored.
    diag.markDegraded("Secret Campaign /opfs/vaults/my-secret-file.md");

    now += 15;
    diag.recordStage("vault_data_ready", attemptId);
    diag.recordReady(attemptId);

    expect(diag.status).toBe("ready");
    expect(diag.pendingDurationMs).toBe(80);
    expect(diag.stageDurationsMs.ready).toBe(80);
    expect(diag.vaultCount).toBe(3);
    expect(diag.entityCount).toBe(42);
    expect(diag.cacheState).toBe("warm");
    expect(diag.degradedAuxiliary).toEqual(["theme"]);

    const summary = diag.formatDiagnosticSummary();
    expect(summary).toContain("Status: ready");
    expect(summary).toContain("Cache state: warm");
    expect(summary).toContain("Vault count: 3");
    expect(summary).toContain("Entity count: 42");
    expect(summary).toContain("Degraded optional tasks: theme");
    expect(summary).not.toContain("Secret Campaign");
    expect(summary).not.toContain("my-secret-file");
    expect(warn).not.toHaveBeenCalled();

    diag.dispose();
  });

  it("triggers timed_out non-destructively at watchdog threshold and transitions to ready on late completion", () => {
    let now = 5000;
    const warn = vi.fn();
    const diag = new VaultBootDiagnostics({
      clock: { now: () => now },
      watchdogMs: DEFAULT_BOOT_WATCHDOG_MS,
      warn,
    });

    const attemptId = diag.startAttempt();
    now += 100;
    diag.recordStage("registry_ready", attemptId);

    now += DEFAULT_BOOT_WATCHDOG_MS - 100;
    vi.advanceTimersByTime(DEFAULT_BOOT_WATCHDOG_MS - 1);
    expect(diag.status).toBe("booting");

    vi.advanceTimersByTime(1);
    expect(diag.status).toBe("timed_out");
    expect(diag.pendingDurationMs).toBe(DEFAULT_BOOT_WATCHDOG_MS);
    expect(diag.stageDurationsMs.timed_out).toBe(DEFAULT_BOOT_WATCHDOG_MS);
    expect(warn).toHaveBeenCalledWith(
      "[VaultBootDiagnostics] Startup watchdog timed out",
      expect.objectContaining({
        phase: "registry_ready",
        attemptCount: 1,
        pendingDurationMs: DEFAULT_BOOT_WATCHDOG_MS,
      }),
    );

    // Late resolution transitions timed_out -> ready without error.
    now += 500;
    diag.recordStage("vault_data_ready", attemptId);
    diag.recordReady(attemptId);
    expect(diag.status).toBe("ready");
    expect(diag.pendingDurationMs).toBe(DEFAULT_BOOT_WATCHDOG_MS + 500);
    diag.dispose();
  });

  it("ignores stale failures from superseded attempts and never leaks error messages", () => {
    const diag = new VaultBootDiagnostics();
    const first = diag.startAttempt();
    const second = diag.startAttempt();

    diag.recordFailure("registry_failed", first);
    expect(diag.status).toBe("booting");
    expect(diag.errorCode).toBeNull();

    diag.recordFailure("vault_load_failed", second);
    expect(diag.status).toBe("failed");
    expect(diag.errorCode).toBe("vault_load_failed");

    expect(
      classifyBootError(
        new DOMException("vault /path/foo.md full", "QuotaExceededError"),
      ),
    ).toBe("quota_exceeded");
    expect(
      classifyBootError(new DOMException("denied", "NotAllowedError")),
    ).toBe("storage_denied");
    expect(classifyBootError(new Error("raw secret path"), "unexpected")).toBe(
      "unexpected",
    );
    expect(
      classifyBootError(
        Object.assign(new Error("wrapped"), {
          code: "vault_load_failed",
          cause: new DOMException("full", "QuotaExceededError"),
        }),
        "vault_load_failed",
      ),
    ).toBe("quota_exceeded");
    expect(
      classifyBootError(
        Object.assign(new Error("wrapped"), {
          code: "vault_load_failed",
          cause: new DOMException("denied", "SecurityError"),
        }),
        "vault_load_failed",
      ),
    ).toBe("storage_denied");
    diag.dispose();
  });
});

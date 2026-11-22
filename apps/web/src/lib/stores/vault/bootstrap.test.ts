import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  (global as any).$state = (v: any) => v;
  (global as any).$state.raw = (v: any) => v;
});

import { VaultBootstrap } from "./bootstrap";
import { VaultBootDiagnostics } from "./boot-diagnostics.svelte";
import { vaultRegistry } from "../vault-registry.svelte";
import { themeStore } from "../theme.svelte";
import { sessionModeStore } from "../ui/session-mode.svelte";
import { getDB } from "../../utils/idb";
import { migrateStructure } from "./migration";
import { statSheetTemplates } from "../stat-sheet-templates.svelte";
import { presentationTemplates } from "../presentation-templates.svelte";
import { VaultSyncError } from "./sync-store.svelte";

vi.mock("../vault-registry.svelte", () => ({
  vaultRegistry: {
    init: vi.fn(),
    rootHandle: {},
    availableVaults: [{ id: "vault", name: "Test Vault" }],
  },
}));
vi.mock("../theme.svelte", () => ({ themeStore: { loadForVault: vi.fn() } }));
vi.mock("../debug.svelte", () => ({
  debugStore: { warn: vi.fn(), error: vi.fn() },
}));
vi.mock("../ui/session-mode.svelte", () => ({
  sessionModeStore: { isGuestMode: false, isDemoMode: false },
}));
vi.mock("../../utils/idb", () => ({ getDB: vi.fn() }));
vi.mock("./migration", () => ({ migrateStructure: vi.fn() }));
vi.mock("../stat-sheet-templates.svelte", () => ({
  statSheetTemplates: { loadForVault: vi.fn() },
}));
vi.mock("../presentation-templates.svelte", () => ({
  presentationTemplates: { loadForVault: vi.fn() },
}));

function setup(watchdogMs = 12_000) {
  const vault = {
    isInitialized: false,
    defaultVisibility: "visible" as "visible" | "hidden",
    migrationRequired: false,
    activeVaultId: "vault" as string | null,
    loadFiles: vi.fn(),
    status: "loading" as "idle" | "loading" | "error",
    errorMessage: null as string | null,
    repository: {
      pendingSaveCount: 0,
      entities: {} as Record<string, unknown>,
    },
  };
  const lifecycle = {
    runMigration: vi.fn().mockResolvedValue(false),
    loadEntityTemplates: vi.fn().mockResolvedValue(undefined),
  };
  const diagnostics = new VaultBootDiagnostics({ watchdogMs });
  const bootstrap = new VaultBootstrap(vault, lifecycle, diagnostics);
  return { vault, lifecycle, diagnostics, bootstrap };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  sessionModeStore.isGuestMode = false;
  sessionModeStore.isDemoMode = false;
  vi.mocked(vaultRegistry.init).mockResolvedValue(undefined);
  vi.mocked(themeStore.loadForVault).mockResolvedValue(undefined);
  vi.mocked(statSheetTemplates.loadForVault).mockResolvedValue(undefined);
  vi.mocked(presentationTemplates.loadForVault).mockResolvedValue(undefined);
  vi.mocked(migrateStructure).mockResolvedValue(undefined);
  vi.mocked(getDB).mockResolvedValue({
    get: vi.fn().mockResolvedValue("hidden"),
  } as unknown as Awaited<ReturnType<typeof getDB>>);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("VaultBootstrap", () => {
  it.each([
    { cacheState: "cold" as const, count: 0 },
    { cacheState: "cold" as const, count: 5 },
    { cacheState: "warm" as const, count: 0 },
    { cacheState: "warm" as const, count: 12 },
  ])(
    "completes happy path for $cacheState cache with $count entities",
    async ({ cacheState, count }) => {
      const { vault, lifecycle, diagnostics, bootstrap } = setup();
      lifecycle.runMigration.mockResolvedValue(true);
      vault.loadFiles.mockImplementation(async (_skip, opts) => {
        opts?.onCacheReady?.({ cacheState, count });
        vault.repository.entities = Object.fromEntries(
          Array.from({ length: count }, (_, i) => [`e-${i}`, { id: `e-${i}` }]),
        );
      });

      await bootstrap.init();

      expect(vault.defaultVisibility).toBe("hidden");
      expect(vault.migrationRequired).toBe(true);
      expect(migrateStructure).toHaveBeenCalledWith(vaultRegistry.rootHandle);
      expect(vault.loadFiles).toHaveBeenCalledWith(
        true,
        expect.objectContaining({
          deferAuxiliary: true,
          throwOnError: true,
        }),
      );
      expect(vault.isInitialized).toBe(true);
      expect(diagnostics.status).toBe("ready");
      expect(diagnostics.cacheState).toBe(cacheState);
      expect(diagnostics.entityCount).toBe(count);
      expect(diagnostics.vaultCount).toBe(1);
      diagnostics.dispose();
    },
  );

  it("does not block vault readiness when theme, templates, or preferences hang or reject", async () => {
    const { vault, lifecycle, diagnostics, bootstrap } = setup();

    // Hanging theme and statSheetTemplates (never resolve)
    vi.mocked(themeStore.loadForVault).mockImplementation(
      () => new Promise<void>(() => {}),
    );
    vi.mocked(statSheetTemplates.loadForVault).mockImplementation(
      () => new Promise<void>(() => {}),
    );
    // Rejecting presentationTemplates, entityTemplates, and preferences
    vi.mocked(presentationTemplates.loadForVault).mockRejectedValue(
      new Error("templates broken"),
    );
    lifecycle.loadEntityTemplates.mockRejectedValue(
      new Error("entity templates broken"),
    );
    vi.mocked(getDB).mockRejectedValue(new Error("prefs failed"));

    vault.loadFiles.mockImplementation(async (_skip, opts) => {
      opts?.onCacheReady?.({ cacheState: "warm", count: 3 });
      opts?.onAuxiliaryDegraded?.("maps");
    });

    await bootstrap.init();

    // Critical path still finishes immediately with default visibility.
    expect(vault.isInitialized).toBe(true);
    expect(vault.defaultVisibility).toBe("visible");
    expect(diagnostics.status).toBe("ready");
    await vi.waitFor(() => {
      expect(diagnostics.degradedAuxiliary).toEqual(
        expect.arrayContaining([
          "preferences",
          "presentation_templates",
          "entity_templates",
          "maps",
        ]),
      );
    });
    diagnostics.dispose();
  });

  it("does not block migrateStorage, loadActiveVault, or readiness when loadPreferences hangs", async () => {
    const { vault, lifecycle, diagnostics, bootstrap } = setup();
    vi.mocked(getDB).mockImplementation(() => new Promise(() => {}));
    vault.loadFiles.mockResolvedValue(undefined);

    await bootstrap.init();

    expect(lifecycle.runMigration).toHaveBeenCalledOnce();
    expect(vault.loadFiles).toHaveBeenCalledOnce();
    expect(vault.defaultVisibility).toBe("visible");
    expect(vault.isInitialized).toBe(true);
    expect(diagnostics.status).toBe("ready");
    diagnostics.dispose();
  });

  it("preserves preloaded guest data and stops after registry in demo mode", async () => {
    const { vault, diagnostics, bootstrap } = setup();
    sessionModeStore.isGuestMode = true;
    await bootstrap.init();
    expect(vaultRegistry.init).not.toHaveBeenCalled();
    expect(vault.isInitialized).toBe(true);
    expect(diagnostics.status).toBe("ready");

    sessionModeStore.isGuestMode = false;
    sessionModeStore.isDemoMode = true;
    await bootstrap.init();
    await Promise.resolve();
    await Promise.resolve();
    expect(vault.defaultVisibility).toBe("hidden");
    expect(migrateStructure).not.toHaveBeenCalled();
    expect(vault.loadFiles).not.toHaveBeenCalled();
    expect(diagnostics.status).toBe("ready");
    diagnostics.dispose();
  });

  it("does not load content or dispatch a switch without an active vault", async () => {
    const { vault, diagnostics, bootstrap } = setup();
    vault.activeVaultId = null;
    const dispatch = vi.spyOn(window, "dispatchEvent");
    await bootstrap.init();
    expect(vault.loadFiles).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
    expect(vault.isInitialized).toBe(true);
    expect(diagnostics.status).toBe("ready");
    dispatch.mockRestore();
    diagnostics.dispose();
  });

  it("never falls back to guest mode on quota or registry failure and recovers on retryInit", async () => {
    const { vault, diagnostics, bootstrap } = setup();
    vi.mocked(vaultRegistry.init).mockRejectedValueOnce(
      new DOMException("full", "QuotaExceededError"),
    );

    await bootstrap.init();

    expect(sessionModeStore.isGuestMode).toBe(false);
    expect(vault.isInitialized).toBe(false);
    expect(vault.status).toBe("error");
    expect(diagnostics.status).toBe("failed");
    expect(diagnostics.errorCode).toBe("quota_exceeded");

    // Retry succeeds cleanly.
    vi.mocked(vaultRegistry.init).mockResolvedValueOnce(undefined);
    vault.loadFiles.mockResolvedValueOnce(undefined);
    await bootstrap.retryInit();

    expect(vault.isInitialized).toBe(true);
    expect(diagnostics.status).toBe("ready");
    expect(diagnostics.attemptCount).toBe(2);
    diagnostics.dispose();
  });

  it("records failure on loadFiles rejection without entering guest mode", async () => {
    const { vault, diagnostics, bootstrap } = setup();
    vault.loadFiles.mockRejectedValueOnce(
      new VaultSyncError("vault_handle_missing", "Missing OPFS handle"),
    );

    await bootstrap.init();

    expect(sessionModeStore.isGuestMode).toBe(false);
    expect(vault.isInitialized).toBe(false);
    expect(vault.status).toBe("error");
    expect(diagnostics.status).toBe("failed");
    expect(diagnostics.errorCode).toBe("vault_handle_missing");
    diagnostics.dispose();
  });

  it("enters timed_out when critical startup hangs, then recovers on retryInit without re-entering in-flight migration", async () => {
    const { vault, lifecycle, diagnostics, bootstrap } = setup(500);
    let resolveMigration!: (v: boolean) => void;
    lifecycle.runMigration.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveMigration = resolve;
        }),
    );
    vault.loadFiles.mockResolvedValue(undefined);

    const initPromise = bootstrap.init();

    await vi.advanceTimersByTimeAsync(500);
    expect(diagnostics.status).toBe("timed_out");
    expect(vault.isInitialized).toBe(false);

    // Retry while migration is still in-flight: must re-arm watchdog and
    // await the existing migration without calling runMigration a second time.
    const retryPromise = bootstrap.retryInit();
    expect(lifecycle.runMigration).toHaveBeenCalledTimes(1);
    expect(diagnostics.status).toBe("booting");
    expect(diagnostics.attemptCount).toBe(2);

    resolveMigration(false);
    await Promise.all([initPromise, retryPromise]);

    expect(vault.isInitialized).toBe(true);
    expect(diagnostics.status).toBe("ready");
    diagnostics.dispose();
  });

  it("ignores stale errors from superseded attempts after retryInit starts a new attempt", async () => {
    const { vault, diagnostics, bootstrap } = setup(500);
    let rejectFirstLoad!: (err: Error) => void;
    vault.loadFiles
      .mockImplementationOnce(
        () =>
          new Promise<void>((_resolve, reject) => {
            rejectFirstLoad = reject;
          }),
      )
      .mockResolvedValueOnce(undefined);

    const firstInit = bootstrap.init();
    await vi.advanceTimersByTimeAsync(500);
    expect(diagnostics.status).toBe("timed_out");

    const retry = bootstrap.retryInit();
    await retry;
    expect(vault.isInitialized).toBe(true);
    expect(diagnostics.status).toBe("ready");

    // Late rejection from the superseded first attempt must not clobber ready state.
    rejectFirstLoad(new Error("late failure"));
    await firstInit;

    expect(vault.isInitialized).toBe(true);
    expect(diagnostics.status).toBe("ready");
    diagnostics.dispose();
  });

  it("prevents an aborted superseded attempt from prematurely marking the vault ready while retry is still booting", async () => {
    const { vault, diagnostics, bootstrap } = setup(500);
    const dispatch = vi.spyOn(window, "dispatchEvent");
    let resolveFirstLoad!: () => void;
    let resolveSecondLoad!: () => void;

    vault.loadFiles
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirstLoad = resolve;
          }),
      )
      .mockImplementationOnce(
        async (_skip, opts) =>
          new Promise<void>((resolve) => {
            resolveSecondLoad = () => {
              opts?.onCacheReady?.({ cacheState: "cold", count: 1 });
              vault.repository.entities = { e1: { id: "e1" } };
              resolve();
            };
          }),
      );

    const firstInit = bootstrap.init();
    await vi.waitFor(() => expect(vault.loadFiles).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(500);
    expect(diagnostics.status).toBe("timed_out");

    const retry = bootstrap.retryInit();
    await vi.waitFor(() => expect(vault.loadFiles).toHaveBeenCalledTimes(2));
    expect(diagnostics.status).toBe("booting");
    expect(vault.isInitialized).toBe(false);

    // Attempt 1 resolves early (as SyncStore aborts it when Attempt 2 starts)
    // while Attempt 2 is still in flight.
    resolveFirstLoad();
    await firstInit;

    expect(vault.isInitialized).toBe(false);
    expect(diagnostics.status).toBe("booting");
    expect(diagnostics.entityCount).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();

    // Now Attempt 2 finishes and completes cleanly.
    resolveSecondLoad();
    await retry;

    expect(vault.isInitialized).toBe(true);
    expect(diagnostics.status).toBe("ready");
    expect(diagnostics.entityCount).toBe(1);
    expect(dispatch).toHaveBeenCalledOnce();
    dispatch.mockRestore();
    diagnostics.dispose();
  });

  it("re-arms watchdog and awaits in-flight init when pendingSaveCount > 0 on retryInit", async () => {
    const { vault, diagnostics, bootstrap } = setup(500);
    vault.repository.pendingSaveCount = 1;

    let resolveLoad!: () => void;
    vault.loadFiles.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveLoad = resolve;
        }),
    );

    const first = bootstrap.init();
    await vi.waitFor(() => expect(vault.loadFiles).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(500);
    expect(diagnostics.status).toBe("timed_out");

    const retry = bootstrap.retryInit();
    expect(vault.loadFiles).toHaveBeenCalledTimes(1);
    expect(diagnostics.status).toBe("booting");

    resolveLoad();
    await Promise.all([first, retry]);
    expect(vault.isInitialized).toBe(true);
    expect(diagnostics.status).toBe("ready");
    diagnostics.dispose();
  });

  it("records migration_failed when migrateStorage rejects and recovers cleanly on retryInit", async () => {
    const { vault, lifecycle, diagnostics, bootstrap } = setup();

    lifecycle.runMigration
      .mockRejectedValueOnce(new Error("migration stalled"))
      .mockResolvedValueOnce(false);

    await bootstrap.init();
    expect(vault.isInitialized).toBe(false);
    expect(vault.status).toBe("error");
    expect(diagnostics.status).toBe("failed");
    expect(diagnostics.errorCode).toBe("migration_failed");

    await bootstrap.retryInit();
    expect(vault.isInitialized).toBe(true);
    expect(diagnostics.status).toBe("ready");
    expect(vault.errorMessage).toBeNull();
    diagnostics.dispose();
  });

  it("clears stale error status and message when retryInit succeeds without calling loadFiles", async () => {
    const { vault, diagnostics, bootstrap } = setup();

    vi.mocked(vaultRegistry.init)
      .mockRejectedValueOnce(new Error("registry failed"))
      .mockResolvedValueOnce(undefined);

    await bootstrap.init();
    expect(vault.status).toBe("error");
    expect(vault.errorMessage).toBeTruthy();

    vault.activeVaultId = null;
    await bootstrap.retryInit();

    expect(vault.isInitialized).toBe(true);
    expect(vault.status).toBe("idle");
    expect(vault.errorMessage).toBeNull();
    expect(diagnostics.status).toBe("ready");
    diagnostics.dispose();
  });
});

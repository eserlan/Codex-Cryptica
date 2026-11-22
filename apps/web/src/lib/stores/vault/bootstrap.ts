import { vaultRegistry } from "../vault-registry.svelte";
import { themeStore } from "../theme.svelte";
import { debugStore } from "../debug.svelte";
import { getDB } from "../../utils/idb";
import { migrateStructure } from "./migration";
import { sessionModeStore } from "../ui/session-mode.svelte";
import { statSheetTemplates } from "../stat-sheet-templates.svelte";
import { presentationTemplates } from "../presentation-templates.svelte";
import type { VaultStore } from "../vault.svelte";
import type { VaultLifecycleManager } from "./lifecycle";
import type { LoadFilesOptions } from "./sync-store.svelte";
import {
  VaultBootDiagnostics,
  classifyBootError,
  type BootErrorCode,
} from "./boot-diagnostics.svelte";

export type BootstrapVault = Pick<
  VaultStore,
  | "isInitialized"
  | "defaultVisibility"
  | "migrationRequired"
  | "activeVaultId"
  | "status"
  | "errorMessage"
> & {
  loadFiles: (
    skipSyncIfWarm?: boolean,
    options?: LoadFilesOptions,
  ) => Promise<void>;
  repository?: {
    pendingSaveCount?: number;
    entities?: Record<string, unknown>;
  };
};

export class VaultBootstrap {
  private migrationInFlight: Promise<void> | null = null;
  private inFlightInit: Promise<void> | null = null;
  private currentAttemptId = 0;

  constructor(
    private vault: BootstrapVault,
    private lifecycle: Pick<
      VaultLifecycleManager,
      "runMigration" | "loadEntityTemplates"
    >,
    private diagnostics: VaultBootDiagnostics = new VaultBootDiagnostics(),
  ) {}

  async init(): Promise<void> {
    if (this.inFlightInit && this.diagnostics.status === "booting") {
      return this.inFlightInit;
    }
    return this.startNewAttempt();
  }

  /**
   * Non-destructive startup retry. Preserves all local storage, never aborts
   * in-flight saves or migrations, and re-arms the watchdog when waiting on
   * active work.
   */
  async retryInit(): Promise<void> {
    if (this.inFlightInit && this.diagnostics.status === "booting") {
      return this.inFlightInit;
    }
    const pendingSaves = this.vault.repository?.pendingSaveCount ?? 0;
    if (
      this.inFlightInit &&
      (this.migrationInFlight !== null || pendingSaves > 0)
    ) {
      this.diagnostics.rearmWatchdog();
      return this.inFlightInit;
    }
    return this.startNewAttempt();
  }

  private startNewAttempt(): Promise<void> {
    if (!sessionModeStore.isGuestMode) {
      this.vault.isInitialized = false;
      this.vault.errorMessage = null;
      this.vault.status = "loading";
    }
    const attemptId = this.diagnostics.startAttempt();
    this.currentAttemptId = attemptId;
    const attemptPromise = this.executeAttempt(attemptId).finally(() => {
      if (this.inFlightInit === attemptPromise) {
        this.inFlightInit = null;
      }
    });
    this.inFlightInit = attemptPromise;
    return attemptPromise;
  }

  private markAttemptReady(attemptId: number, resetStatus = false): void {
    if (resetStatus) {
      this.vault.status = "idle";
      this.vault.errorMessage = null;
    }
    this.vault.isInitialized = true;
    this.diagnostics.recordReady(attemptId);
  }

  private handleAttemptError(
    err: unknown,
    stage: "registry" | "migration" | "load" | "unexpected",
    attemptId: number,
  ): void {
    if (this.isSuperseded(attemptId)) {
      return;
    }
    const fallbackByStage: Record<
      "registry" | "migration" | "load" | "unexpected",
      BootErrorCode
    > = {
      registry: "registry_failed",
      migration: "migration_failed",
      load: "vault_load_failed",
      unexpected: "unexpected",
    };
    const code = classifyBootError(err, fallbackByStage[stage]);
    this.vault.isInitialized = false;
    this.vault.status = "error";
    this.vault.errorMessage = this.describeFailure(code);
    this.diagnostics.recordFailure(code, attemptId);
    debugStore.error("[VaultStore] Init failed", {
      code,
      phase: this.diagnostics.activePhase,
    });
  }

  private async executeAttempt(attemptId: number): Promise<void> {
    // Guest popout tabs pre-populate the vault via applyGuestPayload before
    // this runs — skip full init so loadFiles() doesn't overwrite that data.
    if (sessionModeStore.isGuestMode) {
      this.markAttemptReady(attemptId, true);
      return;
    }

    let stage: "registry" | "migration" | "load" | "unexpected" = "unexpected";

    try {
      stage = "registry";
      await vaultRegistry.init();
      if (this.isSuperseded(attemptId)) return;

      this.diagnostics.setCounts({
        vaultCount: vaultRegistry.availableVaults?.length ?? 0,
      });
      this.diagnostics.recordStage("registry_ready", attemptId);

      // Preferences must never block vault readiness; default to "visible" and
      // apply asynchronously if the read completes before this attempt is superseded.
      this.vault.defaultVisibility = "visible";
      this.loadPreferences(attemptId);

      if (sessionModeStore.isDemoMode) {
        this.markAttemptReady(attemptId, true);
        return;
      }

      stage = "migration";
      await this.migrateStorage();
      if (this.isSuperseded(attemptId)) return;

      this.diagnostics.recordStage("migration_ready", attemptId);

      stage = "load";
      const hadActiveVault = Boolean(this.vault.activeVaultId);
      await this.loadActiveVault(attemptId);
      if (this.isSuperseded(attemptId)) return;

      this.notifyVaultSwitched();
      this.markAttemptReady(attemptId, !hadActiveVault);
    } catch (err: unknown) {
      this.handleAttemptError(err, stage, attemptId);
    }
  }

  private isSuperseded(attemptId: number): boolean {
    return attemptId !== this.currentAttemptId;
  }

  private loadPreferences(attemptId: number): void {
    this.runNonBlocking(
      async () => {
        const db = await getDB();
        return db.get("settings", "defaultVisibility");
      },
      (pref) => {
        if (this.isSuperseded(attemptId)) return;
        if (pref === "visible" || pref === "hidden") {
          this.vault.defaultVisibility = pref;
        }
      },
      () => {
        if (this.isSuperseded(attemptId)) return;
        this.vault.defaultVisibility = "visible";
        this.diagnostics.markDegraded("preferences");
      },
    );
  }

  private async migrateStorage() {
    if (!this.migrationInFlight) {
      this.migrationInFlight = (async () => {
        this.vault.migrationRequired =
          (await this.lifecycle.runMigration()) ?? false;

        const opfsRoot = vaultRegistry.rootHandle;
        if (opfsRoot) {
          await migrateStructure(opfsRoot);
        }
      })().finally(() => {
        this.migrationInFlight = null;
      });
    }
    return this.migrationInFlight;
  }

  private runNonBlocking<T>(
    task: () => Promise<T> | T,
    onFulfilled: (value: T) => void,
    onRejected: () => void,
  ) {
    try {
      Promise.resolve(task()).then(onFulfilled, onRejected);
    } catch {
      onRejected();
    }
  }

  private startAuxiliaryLoads(vaultId: string, attemptId: number) {
    this.runNonBlocking(
      () => themeStore.loadForVault(vaultId),
      () => {
        this.diagnostics.recordStage("theme_ready", attemptId);
      },
      () => {
        if (this.isSuperseded(attemptId)) return;
        this.diagnostics.markDegraded("theme");
      },
    );

    const templateTasks = [
      ["stat_sheet_templates", () => statSheetTemplates.loadForVault(vaultId)],
      [
        "presentation_templates",
        () => presentationTemplates.loadForVault(vaultId),
      ],
      ["entity_templates", () => this.lifecycle.loadEntityTemplates(vaultId)],
    ] as const;

    const settledPromises = templateTasks.map(([source, fn]) => {
      try {
        return Promise.resolve(fn()).catch(() => {
          if (!this.isSuperseded(attemptId)) {
            this.diagnostics.markDegraded(source);
          }
          return Promise.reject();
        });
      } catch {
        if (!this.isSuperseded(attemptId)) {
          this.diagnostics.markDegraded(source);
        }
        return Promise.reject();
      }
    });

    void Promise.allSettled(settledPromises).then(() => {
      this.diagnostics.recordStage("templates_ready", attemptId);
    });
  }

  private async loadActiveVault(attemptId: number) {
    if (!this.vault.activeVaultId) return;

    const vaultId = this.vault.activeVaultId;
    // Theme and templates enrich the workspace, but must never block vault
    // entities from becoming available in Graph or Entity Table.
    this.startAuxiliaryLoads(vaultId, attemptId);

    await this.vault.loadFiles(true, {
      deferAuxiliary: true,
      throwOnError: true,
      onCacheReady: ({ cacheState, count }) => {
        if (this.isSuperseded(attemptId)) return;
        this.diagnostics.setCacheState(cacheState);
        this.diagnostics.setCounts({ entityCount: count });
        this.diagnostics.recordStage("vault_cache_ready", attemptId);
      },
      onAuxiliaryDegraded: (source) => {
        if (this.isSuperseded(attemptId)) return;
        this.diagnostics.markDegraded(source);
      },
    });

    if (this.isSuperseded(attemptId)) return;

    const repoEntities = this.vault.repository?.entities;
    if (repoEntities) {
      this.diagnostics.setCounts({
        entityCount: Object.keys(repoEntities).length,
      });
    }
    this.diagnostics.recordStage("vault_data_ready", attemptId);
  }

  private notifyVaultSwitched() {
    if (typeof window !== "undefined" && this.vault.activeVaultId) {
      window.dispatchEvent(
        new CustomEvent("vault-switched", {
          detail: { id: this.vault.activeVaultId },
        }),
      );
    }
  }

  private describeFailure(code: BootErrorCode): string {
    switch (code) {
      case "quota_exceeded":
        return "Browser storage is full. Your local vault files were not changed.";
      case "storage_denied":
        return "Browser storage access was denied. Your local vault files were not changed.";
      case "vault_handle_missing":
        return "Could not open local vault storage. Your local vault files were not changed.";
      default:
        return "Could not finish opening your vault. Your local vault files were not changed.";
    }
  }
}

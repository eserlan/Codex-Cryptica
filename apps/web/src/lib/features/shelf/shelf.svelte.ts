import {
  EntityShelfService,
  type ImportOutcome,
  type ImportPlan,
  type ProgressReport,
  type ShelfEntrySummary,
} from "@codex/entity-shelf";
import { appEventBus as defaultAppEventBus } from "@codex/events";
import { SHELF_EVENTS } from "$lib/events/shelf";
import { idbShelfStore } from "./idb-shelf-store.svelte";
import {
  vaultRecordCodec,
  WebShelfVault,
  type ShelfVaultDeps,
} from "./web-shelf-vault";

/**
 * The Shelf store: entry list state, shelve and import actions, cross-tab
 * propagation, and progress reporting.
 *
 * Only one vault is open at a time, so the reader and writer are both bound to
 * whichever vault that is. An author shelves from vault A, switches, and
 * imports into vault B.
 */

export interface ShelfStoreDeps {
  vault: ShelfVaultDeps;
  service?: EntityShelfService;
  appEventBus?: typeof defaultAppEventBus;
}

/** Warn once the shelf passes this share of the browser's reported allowance (FR-025). */
const STORAGE_WARNING_RATIO = 0.8;

/** Below this, an operation finishes fast enough that progress would only flicker (SC-009). */
const PROGRESS_VISIBLE_AFTER_MS = 1_000;

export class ShelfStore {
  entries = $state<ShelfEntrySummary[]>([]);
  totalBytes = $state(0);
  quotaBytes = $state<number | null>(null);
  busy = $state(false);
  progress = $state<ProgressReport | null>(null);
  lastOutcome = $state<ImportOutcome | null>(null);
  error = $state<string | null>(null);

  private readonly service: EntityShelfService;
  private readonly bus: typeof defaultAppEventBus;
  private unsubscribe: (() => void) | null = null;
  private progressTimer: ReturnType<typeof setTimeout> | null = null;
  private progressVisible = false;

  constructor(private readonly deps: ShelfStoreDeps) {
    this.bus = deps.appEventBus ?? defaultAppEventBus;
    const vault = new WebShelfVault(deps.vault);
    this.service =
      deps.service ??
      new EntityShelfService({
        store: idbShelfStore,
        readerFor: () => vault,
        writerFor: () => vault,
        codec: vaultRecordCodec,
      });
  }

  /** True once the shelf is using most of the space the browser will give it. */
  get nearingStorageLimit(): boolean {
    if (this.quotaBytes === null || this.quotaBytes === 0) return false;
    return this.totalBytes / this.quotaBytes > STORAGE_WARNING_RATIO;
  }

  /**
   * Starts listening for shelf changes in other tabs. The event carries no
   * payload, so each tab re-reads from storage (FR-023a).
   */
  start(): void {
    this.unsubscribe?.();
    this.unsubscribe = this.bus.subscribe(
      SHELF_EVENTS.CHANGED,
      () => void this.refresh(),
      "shelf-store",
    );
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  /**
   * Rolls back any import that never finished. Call before the shelf becomes
   * usable, so a half-written import from a previous session cannot be mistaken
   * for real content (FR-020).
   */
  async recoverCrashedImports(): Promise<void> {
    try {
      await this.service.recoverCrashedImports();
    } catch (err) {
      console.error("[Shelf] Could not clean up an unfinished import:", err);
    }
  }

  async refresh(): Promise<void> {
    this.entries = await this.service.listEntries();
    this.totalBytes = await this.service.totalBytes();
    this.quotaBytes = await readStorageQuota();
  }

  /** Copies entities onto the Shelf. The source vault is only ever read. */
  async shelve(entityIds: string[], vaultName: string): Promise<boolean> {
    const vaultId = this.deps.vault.activeVaultId();
    if (!vaultId) return false;

    return this.run(async () => {
      await this.service.shelve({ vaultId, vaultName, entityIds }, (report) =>
        this.reportProgress(report),
      );
    });
  }

  /** Builds an import so its conflicts can be settled before anything is written. */
  plan(entryIds: string[]): Promise<ImportPlan> {
    const vaultId = this.deps.vault.activeVaultId();
    if (!vaultId) throw new Error("No vault is open.");
    return this.service.plan(entryIds, vaultId);
  }

  choose(
    plan: ImportPlan,
    templateId: string,
    choice: "keep-existing" | "bring-in",
  ): ImportPlan {
    return this.service.choose(plan, templateId, choice);
  }

  async import(plan: ImportPlan): Promise<boolean> {
    return this.run(async () => {
      this.lastOutcome = await this.service.import(plan, (report) =>
        this.reportProgress(report),
      );
    });
  }

  async removeEntry(id: string): Promise<void> {
    await this.service.removeEntry(id);
    await this.announce();
  }

  async clear(): Promise<void> {
    await this.service.clear();
    await this.announce();
  }

  private async run(work: () => Promise<void>): Promise<boolean> {
    // Two concurrent imports would each plan identifiers against the same
    // pre-import view of the vault, mint the same ones, and collide mid-write.
    if (this.busy) return false;

    this.busy = true;
    this.error = null;
    // Nothing appears for a fast operation — progress that flashes for 80ms is
    // noise, not reassurance.
    this.progressTimer = setTimeout(() => {
      if (!this.busy) return;
      this.progressVisible = true;
      this.progress ??= { completed: 0, total: 0, label: "" };
    }, PROGRESS_VISIBLE_AFTER_MS);

    try {
      await work();
      await this.announce();
      return true;
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
      return false;
    } finally {
      if (this.progressTimer) clearTimeout(this.progressTimer);
      this.progressTimer = null;
      this.progressVisible = false;
      this.progress = null;
      this.busy = false;
    }
  }

  private reportProgress(report: ProgressReport): void {
    // Suppressed until the timer above decides the operation is slow enough to
    // be worth showing — progress that flashes for 80ms is noise.
    if (this.progressVisible) this.progress = report;
  }

  /** Refreshes this tab and tells the others to do the same. */
  private async announce(): Promise<void> {
    await this.refresh();
    this.bus.emit({
      type: SHELF_EVENTS.CHANGED,
      domain: "shelf",
      payload: {},
      metadata: { timestamp: Date.now(), sync: true },
    });
  }
}

async function readStorageQuota(): Promise<number | null> {
  try {
    const estimate = await navigator.storage?.estimate?.();
    return estimate?.quota ?? null;
  } catch {
    return null;
  }
}

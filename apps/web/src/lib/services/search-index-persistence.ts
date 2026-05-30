import type { SearchEngine } from "@codex/search-engine";
import type * as Comlink from "comlink";
import { entityDb } from "../utils/entity-db";
import { debugStore } from "../stores/debug.svelte";
import type { SearchProgressCoordinator } from "./search-progress-coordinator";

type PersistenceApi = Pick<SearchEngine, "exportIndex" | "importIndex">;

export interface SearchIndexPersistenceDeps {
  db?: typeof entityDb;
  debug?: typeof debugStore;
  coordinator: SearchProgressCoordinator;
  getApi: () => Promise<Comlink.Remote<PersistenceApi> | PersistenceApi>;
}

export class SearchIndexPersistence {
  private db: typeof entityDb;
  private debug: typeof debugStore;
  private coordinator: SearchProgressCoordinator;
  private getApi: () => Promise<
    Comlink.Remote<PersistenceApi> | PersistenceApi
  >;

  constructor(deps: SearchIndexPersistenceDeps) {
    this.db = deps.db ?? entityDb;
    this.debug = deps.debug ?? debugStore;
    this.coordinator = deps.coordinator;
    this.getApi = deps.getApi;
  }

  async loadIndex(vaultId: string): Promise<boolean> {
    const api = await this.getApi();
    this.coordinator.activeVaultId = vaultId;
    try {
      const record = await this.db.searchIndex.get(vaultId);
      if (record && record.data) {
        const runId = this.coordinator.createRunId(vaultId);
        this.coordinator.emitProgress({
          status: "restoring",
          vaultId,
          runId,
          indexedCount: 0,
          totalCount: null,
          isPartial: true,
          canRetry: false,
          message: "Search is restoring.",
          error: null,
        });
        await api.importIndex(record.data);
        this.coordinator.isDirty = false;
        this.coordinator.emitProgress({
          status: "ready",
          vaultId,
          runId,
          indexedCount: 0,
          totalCount: null,
          isPartial: false,
          canRetry: false,
          message: "Search is ready.",
          error: null,
        });
        return true;
      }
    } catch (err: any) {
      this.debug.warn(
        `[SearchIndexPersistence] Failed to load index for ${vaultId}: ${err?.message || "Unknown error"}`,
        err,
      );
    }
    return false;
  }

  async saveIndex(vaultId: string): Promise<void> {
    const api = await this.getApi();
    const p = this.coordinator.getIndexProgress();
    if (p.vaultId === vaultId && p.isPartial) {
      this.debug.log(
        `[SearchIndexPersistence] Save skipped: Rebuild is still partial.`,
      );
      return;
    }
    try {
      this.debug.log(
        `[SearchIndexPersistence] Save started: Exporting index for ${vaultId}...`,
      );
      const start = performance.now();
      const rawData = await api.exportIndex();

      const explicitKeyCount =
        typeof rawData?.keyCount === "number" ? rawData.keyCount : undefined;
      const segmentedKeyCount =
        rawData?.isSegmented &&
        rawData?.segments &&
        typeof rawData.segments === "object"
          ? Object.keys(rawData.segments).length
          : undefined;
      const encodedPayload =
        rawData?.isEncoded && rawData && typeof rawData === "object"
          ? "payload" in rawData
            ? (rawData as any).payload
            : "data" in rawData
              ? (rawData as any).data
              : undefined
          : undefined;
      const encodedKeyCount =
        rawData?.isEncoded &&
        encodedPayload &&
        typeof encodedPayload === "object"
          ? Array.isArray(encodedPayload)
            ? encodedPayload.length
            : Object.keys(encodedPayload).length
          : undefined;
      const keyCount =
        explicitKeyCount ??
        segmentedKeyCount ??
        encodedKeyCount ??
        Object.keys(rawData || {}).length;

      if (rawData && keyCount > 1) {
        await this.db.searchIndex.put({
          vaultId,
          data: rawData,
          updatedAt: Date.now(),
        });
        this.coordinator.isDirty = false;
        this.debug.log(
          `[SearchIndexPersistence] Save finished: Persisted index for ${vaultId} (${keyCount} keys) in ${(performance.now() - start).toFixed(2)}ms`,
        );
      } else {
        this.debug.log(
          `[SearchIndexPersistence] Save skipped: Index is empty or export failed.`,
        );
      }
    } catch (err: any) {
      this.debug.warn(
        `[SearchIndexPersistence] Failed to save index for ${vaultId}: ${err?.message || "Unknown error"}`,
        err,
      );
    }
  }
}

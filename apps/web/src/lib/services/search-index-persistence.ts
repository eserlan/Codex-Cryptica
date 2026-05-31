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
        let indexData = record.data;

        // Check if data is stored as a compressed Blob (or mock stream object in test environment)
        if (
          indexData instanceof Blob ||
          (typeof indexData === "object" &&
            indexData !== null &&
            "stream" in indexData)
        ) {
          const blobData = indexData as Blob;
          if (typeof DecompressionStream !== "undefined") {
            const rawStream =
              typeof blobData.stream === "function"
                ? blobData.stream()
                : new ReadableStream({
                    async start(controller) {
                      try {
                        const arrayBuffer = await blobData.arrayBuffer();
                        controller.enqueue(new Uint8Array(arrayBuffer));
                      } catch (err) {
                        controller.error(err);
                      }
                      controller.close();
                    },
                  });
            const stream = rawStream.pipeThrough(
              new DecompressionStream("deflate-raw"),
            );
            const text = await new Response(stream).text();
            indexData = JSON.parse(text);
          } else {
            this.debug.warn(
              "[SearchIndexPersistence] DecompressionStream not supported in this environment, falling back to reading Blob as text directly.",
            );
            const text = await blobData.text();
            indexData = JSON.parse(text);
          }
        } else if (indexData instanceof Uint8Array) {
          if (typeof DecompressionStream !== "undefined") {
            const stream = new Blob([indexData as BlobPart])
              .stream()
              .pipeThrough(new DecompressionStream("deflate-raw"));
            const text = await new Response(stream).text();
            indexData = JSON.parse(text);
          } else {
            this.debug.warn(
              "[SearchIndexPersistence] DecompressionStream not supported in this environment, attempting uncompressed Uint8Array decoding.",
            );
            const text = new TextDecoder().decode(indexData);
            indexData = JSON.parse(text);
          }
        }

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
        await api.importIndex(indexData);
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
        let persistedData: Blob | Record<string, any> = rawData;
        if (typeof CompressionStream !== "undefined") {
          try {
            const jsonString = JSON.stringify(rawData);
            const rawStream =
              typeof Blob.prototype.stream === "function"
                ? new Blob([jsonString]).stream()
                : new ReadableStream({
                    start(controller) {
                      controller.enqueue(new TextEncoder().encode(jsonString));
                      controller.close();
                    },
                  });
            const stream = rawStream.pipeThrough(
              new CompressionStream("deflate-raw"),
            );
            persistedData = await new Response(stream).blob();
          } catch (compressErr: any) {
            this.debug.warn(
              `[SearchIndexPersistence] Compression failed, falling back to raw JSON object: ${compressErr?.message || "Unknown error"}`,
              compressErr,
            );
          }
        }

        await this.db.searchIndex.put({
          vaultId,
          data: persistedData,
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

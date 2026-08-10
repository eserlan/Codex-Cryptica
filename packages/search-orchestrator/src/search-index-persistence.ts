import type { CompressedSearchIndex, SearchEngine } from "@codex/search-engine";
import type * as Comlink from "comlink";

type DebugLogger = {
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
};
import type { SearchProgressCoordinator } from "./search-progress-coordinator";
import { systemClock } from "./runtime";
import {
  performanceRecorder,
  type PerformanceRecorder,
} from "@codex/performance-observability";

type PersistenceApi = Pick<SearchEngine, "exportIndex" | "importIndex"> & {
  exportIndexCompressed?: () => Promise<CompressedSearchIndex>;
  importIndexCompressed?: (payload: CompressedSearchIndex) => Promise<void>;
};

function decodePersistedSegment(value: unknown): string {
  if (typeof value === "string") return value;

  if (
    value &&
    typeof value === "object" &&
    (value instanceof ArrayBuffer ||
      ArrayBuffer.isView(value) ||
      value.constructor?.name === "ArrayBuffer" ||
      value.constructor?.name === "Uint8Array" ||
      "byteLength" in value)
  ) {
    return new TextDecoder().decode(value as ArrayBuffer | ArrayBufferView);
  }

  if (Array.isArray(value)) {
    return new TextDecoder().decode(new Uint8Array(value));
  }

  if (value && typeof value === "object") {
    return new TextDecoder().decode(
      new Uint8Array(Object.values(value) as number[]),
    );
  }

  return "";
}

function validateSegmentedIndexData(data: any): string | null {
  if (!data?.isSegmented) return null;
  if (!data.segments || typeof data.segments !== "object") {
    return "segmented payload is missing segments";
  }

  const docIdsSegment = data.segments._docIds;
  const docIdsJson = decodePersistedSegment(docIdsSegment).trim();
  if (!docIdsJson) {
    return "segmented payload is missing document IDs";
  }

  try {
    const docIds = JSON.parse(docIdsJson);
    if (!Array.isArray(docIds)) {
      return "segmented payload document IDs are not an array";
    }
  } catch {
    return "segmented payload document IDs are invalid JSON";
  }

  return null;
}

export interface SearchIndexPersistenceDeps {
  db?: any;
  debug?: DebugLogger;
  coordinator: SearchProgressCoordinator;
  getApi: () => Promise<Comlink.Remote<PersistenceApi> | PersistenceApi>;
  performanceRecorder?: PerformanceRecorder;
}

export class SearchIndexPersistence {
  private db: any;
  private debug: DebugLogger;
  private coordinator: SearchProgressCoordinator;
  private getApi: () => Promise<
    Comlink.Remote<PersistenceApi> | PersistenceApi
  >;
  private performanceRecorder: PerformanceRecorder;
  private saveGenerations = new Map<string, number>();
  private idleCallbacks = new Map<
    string,
    { handle: number; resolve: () => void }
  >();

  constructor(deps: SearchIndexPersistenceDeps) {
    this.db = deps.db;
    this.debug = deps.debug ?? (globalThis as any).__debugStore__ ?? console;
    this.coordinator = deps.coordinator;
    this.getApi = deps.getApi;
    this.performanceRecorder = deps.performanceRecorder ?? performanceRecorder;
  }

  setPerformanceRecorder(performance: PerformanceRecorder): void {
    this.performanceRecorder = performance;
  }

  async loadIndex(vaultId: string): Promise<boolean> {
    const api = await this.getApi();
    this.coordinator.activeVaultId = vaultId;
    try {
      const record = await this.getDb().searchIndex.get(vaultId);
      if (record && record.data) {
        const compressedApi = api as PersistenceApi;
        if (
          record.format === "fflate-json-v1" &&
          typeof compressedApi.importIndexCompressed === "function"
        ) {
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
          await compressedApi.importIndexCompressed({
            format: record.format,
            data:
              record.data instanceof Uint8Array
                ? record.data
                : new Uint8Array(record.data),
            keyCount: record.keyCount ?? 0,
          });
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

        const invalidReason = validateSegmentedIndexData(indexData);
        if (invalidReason) {
          this.debug.warn(
            `[SearchIndexPersistence] Ignoring stored index for ${vaultId}: ${invalidReason}.`,
          );
          return false;
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
    const generation = (this.saveGenerations.get(vaultId) ?? 0) + 1;
    this.saveGenerations.set(vaultId, generation);

    const previousIdle = this.idleCallbacks.get(vaultId);
    if (previousIdle !== undefined) {
      if (typeof globalThis.cancelIdleCallback === "function") {
        globalThis.cancelIdleCallback(previousIdle.handle);
      }
      previousIdle.resolve();
      this.idleCallbacks.delete(vaultId);
    }

    return new Promise<void>((resolve) => {
      const run = () => {
        this.idleCallbacks.delete(vaultId);
        if (this.saveGenerations.get(vaultId) !== generation) {
          resolve();
          return;
        }
        void this.persistIndex(vaultId, generation).finally(resolve);
      };

      if (typeof globalThis.requestIdleCallback === "function") {
        const handle = globalThis.requestIdleCallback(run, { timeout: 1500 });
        this.idleCallbacks.set(vaultId, { handle, resolve });
      } else {
        run();
      }
    });
  }

  private async persistIndex(
    vaultId: string,
    generation: number,
  ): Promise<void> {
    const api = await this.getApi();
    const p = this.coordinator.getIndexProgress();
    if (p.vaultId === vaultId && p.isPartial) {
      this.debug.log(
        `[SearchIndexPersistence] Save skipped: Rebuild is still partial.`,
      );
      return;
    }
    const saveSpan = this.performanceRecorder.start("search_index_persist");
    try {
      this.debug.log(
        `[SearchIndexPersistence] Save started: Exporting index for ${vaultId}...`,
      );
      const start = performance.now();

      const compressedApi = api as PersistenceApi;
      if (typeof compressedApi.exportIndexCompressed === "function") {
        try {
          const payload = await compressedApi.exportIndexCompressed();
          if (this.saveGenerations.get(vaultId) !== generation) return;
          if (!payload?.data || payload.keyCount <= 1) {
            saveSpan.complete(() => ({
              indexedInputCount: payload?.keyCount ?? 0,
            }));
            return;
          }
          await this.getDb().searchIndex.put({
            vaultId,
            data: payload.data,
            format: payload.format,
            keyCount: payload.keyCount,
            updatedAt: systemClock.now(),
          });
          if (this.saveGenerations.get(vaultId) === generation) {
            this.coordinator.isDirty = false;
          }
          saveSpan.complete(() => ({ indexedInputCount: payload.keyCount }));
          this.debug.log(
            `[SearchIndexPersistence] Save finished: Persisted worker-compressed index for ${vaultId} (${payload.keyCount} keys) in ${(performance.now() - start).toFixed(2)}ms`,
          );
          return;
        } catch (compressionError) {
          this.debug.warn(
            "[SearchIndexPersistence] Worker compression failed; falling back to legacy persistence.",
            compressionError,
          );
        }
      }

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

      if (!rawData) {
        saveSpan.fail("unexpected");
        this.debug.warn(
          `[SearchIndexPersistence] Save skipped: Export did not return index data.`,
        );
      } else if (keyCount <= 1) {
        saveSpan.complete(() => ({
          indexedInputCount: keyCount,
        }));
        this.debug.log(
          `[SearchIndexPersistence] Save skipped: Index is empty.`,
        );
      } else {
        let persistedData: any = rawData;

        // Convert ArrayBuffer segments to strings so that rawData is JSON-serializable
        if (rawData && rawData.isSegmented && rawData.segments) {
          const decoder = new TextDecoder();
          const serializableSegments: Record<string, any> = {};
          for (const [k, v] of Object.entries(rawData.segments)) {
            const isBinary =
              v &&
              typeof v === "object" &&
              (v instanceof ArrayBuffer ||
                ArrayBuffer.isView(v) ||
                v.constructor?.name === "ArrayBuffer" ||
                v.constructor?.name === "Uint8Array" ||
                "byteLength" in v);
            if (isBinary) {
              serializableSegments[k] = decoder.decode(v as any);
            } else if (typeof v === "string") {
              serializableSegments[k] = v;
            } else {
              serializableSegments[k] = v;
            }
          }
          persistedData = {
            ...rawData,
            segments: serializableSegments,
          };
        }

        if (typeof CompressionStream !== "undefined") {
          try {
            const jsonString = JSON.stringify(persistedData);
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

        if (this.saveGenerations.get(vaultId) !== generation) return;
        await this.getDb().searchIndex.put({
          vaultId,
          data: persistedData,
          updatedAt: systemClock.now(),
        });
        this.coordinator.isDirty = false;
        saveSpan.complete(() => ({
          indexedInputCount: keyCount,
        }));
        this.debug.log(
          `[SearchIndexPersistence] Save finished: Persisted index for ${vaultId} (${keyCount} keys) in ${(performance.now() - start).toFixed(2)}ms`,
        );
      }
    } catch (err: any) {
      saveSpan.fail("unexpected");
      this.debug.warn(
        `[SearchIndexPersistence] Failed to save index for ${vaultId}: ${err?.message || "Unknown error"}`,
        err,
      );
    }
  }

  private getDb(): any {
    const db = this.db ?? (globalThis as any).__entityDb__;
    if (!db) {
      throw new Error(
        "[SearchIndexPersistence] Entity database is not configured",
      );
    }
    return db;
  }
}

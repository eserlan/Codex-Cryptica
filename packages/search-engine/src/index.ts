import FlexSearch from "flexsearch";
import type { SearchEntry, SearchResult, SearchOptions } from "schema";
import * as Comlink from "comlink";

export type SearchIndexStatus =
  | "idle"
  | "restoring"
  | "rebuilding"
  | "partial"
  | "ready"
  | "cancelled"
  | "failed";

export interface SearchIndexProgress {
  status: SearchIndexStatus;
  vaultId: string | null;
  runId: string | null;
  indexedCount: number;
  totalCount: number | null;
  isPartial: boolean;
  canRetry: boolean;
  message: string;
  error: string | null;
}

export interface ProgressiveBatchOptions {
  runId: string;
  vaultId: string;
  batchIndex: number;
  indexedBefore: number;
  totalCount: number | null;
}

export interface ProgressiveBatchResult {
  runId: string;
  vaultId: string;
  acceptedCount: number;
  failedIds: string[];
}

// Helper extracted from apps/web/src/lib/utils/search-utils.ts
export function extractIdAndDoc(item: any): { id: string | null; doc: any } {
  if (item.doc || item.d) {
    return {
      id: item.id || item.doc?.id || item.d?.id,
      doc: item.doc || item.d,
    };
  }
  return { id: item.id || item, doc: item.doc || item };
}

export class SearchEngine {
  private index: any = null;
  private docIds = new Set<string>();
  private taskQueue: Promise<void> = Promise.resolve();
  private onLog:
    | ((level: "info" | "warn" | "error", msg: string, data?: any) => void)
    | null = null;
  private onChange: (() => void) | null = null;

  get docCount() {
    return this.docIds.size;
  }

  constructor() {
    // Index initialization is deferred to explicit initIndex() calls
    // from the service layer or lazy-initialized during first write.
  }

  setLogger(
    callback: (
      level: "info" | "warn" | "error",
      msg: string,
      data?: any,
    ) => void,
  ) {
    this.onLog = callback;
    this.log("info", "Logger attached to SearchEngine");
  }

  setChangeCallback(callback: () => void) {
    this.onChange = callback;
  }

  private log(level: "info" | "warn" | "error", msg: string, data?: any) {
    console[level](`[SearchEngine] ${msg}`, data || "");
    if (this.onLog) {
      try {
        this.onLog(level, msg, data);
      } catch (err) {
        console.error("Failed to send log to main thread", err);
      }
    }
  }

  private notifyChange() {
    if (this.onChange) {
      try {
        this.onChange();
      } catch (err) {
        console.error("Failed to notify index change", err);
      }
    }
  }

  initIndex() {
    this.log("info", "Initializing FlexSearch index...");
    const config: any = {
      id: "id",
      index: [
        {
          field: "title",
          tokenize: "full",
          optimize: true,
          // resolution 9 is the FlexSearch maximum; resolution 6 uses ~40%
          // less index memory with no practical recall difference for short
          // fields like titles (typically < 60 chars).
          resolution: 6,
        },
        {
          field: "aliases",
          tokenize: "full",
          optimize: true,
          resolution: 6,
        },
        {
          field: "keywords",
          tokenize: "full",
          optimize: true,
          resolution: 6,
        },
        {
          field: "content",
          tokenize: "forward",
          optimize: true,
          resolution: 5,
          minlength: 2,
        },
      ],
      store: ["id", "title", "path", "content", "type", "status"],
    };

    this.index = new FlexSearch.Document(config);
  }

  async add(doc: SearchEntry) {
    this.taskQueue = this.taskQueue.then(async () => {
      if (!this.index) {
        this.log("warn", "Index was null during add(), re-initializing.");
        this.initIndex();
      }
      try {
        this.index.add(doc);
        this.docIds.add(doc.id);
        this.notifyChange();
      } catch (err) {
        this.log("error", `Failed to add document ${doc.id}`, err);
      }
    });
    return this.taskQueue;
  }

  async addBatch(docs: SearchEntry[]) {
    await this.addBatchProgressive(docs, {
      runId: "legacy",
      vaultId: "legacy",
      batchIndex: 0,
      indexedBefore: this.docCount,
      totalCount: null,
    });
  }

  async addBatchProgressive(
    docs: SearchEntry[],
    options: ProgressiveBatchOptions,
  ): Promise<ProgressiveBatchResult> {
    let result: ProgressiveBatchResult = {
      runId: options.runId,
      vaultId: options.vaultId,
      acceptedCount: 0,
      failedIds: [],
    };

    const task = this.taskQueue.then(async () => {
      if (!this.index) {
        this.log(
          "warn",
          "Index was null during addBatchProgressive(), re-initializing.",
        );
        this.initIndex();
      }
      let count = 0;
      const errors: string[] = [];
      for (const doc of docs) {
        try {
          this.index.add(doc);
          this.docIds.add(doc.id);
          count++;
        } catch (err) {
          this.log("error", `Failed to add document ${doc.id}`, err);
          errors.push(doc.id);
        }
      }
      if (errors.length > 0) {
        this.log(
          "warn",
          `Batch complete with ${errors.length} errors: ${errors.join(", ")}`,
        );
      }
      if (count > 0) {
        this.notifyChange();
      }
      result = {
        runId: options.runId,
        vaultId: options.vaultId,
        acceptedCount: count,
        failedIds: errors,
      };
    });
    this.taskQueue = task;
    await task;
    return result;
  }

  async remove(id: string) {
    this.taskQueue = this.taskQueue.then(async () => {
      if (!this.index) return;
      this.log("info", `Removing document: ${id}`);
      this.index.remove(id);
      this.docIds.delete(id);
      this.notifyChange();
    });
    return this.taskQueue;
  }

  async search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    if (!this.index) {
      this.log("warn", "Search called but index is null.");
      return [];
    }

    const limit = options.limit || 20;
    this.log(
      "info",
      `Searching ${this.docCount} documents for: "${query}" (limit: ${limit})`,
    );
    const results = await this.index.searchAsync(query, {
      limit,
      enrich: true,
      suggest: true,
    });

    this.log("info", `Raw field results count: ${results.length}`);
    const resultsMap = new Map<string, SearchResult>();

    // Process results from all fields
    for (const fieldResult of results) {
      const field = fieldResult.field as
        | "title"
        | "aliases"
        | "content"
        | "keywords";
      const isTitle = field === "title";
      const isAliases = field === "aliases";
      const isKeywords = field === "keywords";
      const baseScore = isTitle
        ? 1.0
        : isAliases
          ? 0.9
          : isKeywords
            ? 0.8
            : 0.5;

      this.log(
        "info",
        `Field "${field}" returned ${fieldResult.result.length} matches.`,
      );

      for (let i = 0; i < fieldResult.result.length; i++) {
        const item = fieldResult.result[i];
        const { id, doc: entry } = extractIdAndDoc(item);

        if (!id) {
          this.log("warn", `Could not extract ID from item:`, item);
          continue;
        }

        // Filter out drafts unless explicitly included
        if (entry?.status === "draft" && !options.includeDrafts) {
          continue;
        }

        const rankAdjustment = Math.min(i * 0.0001, 0.05);
        const currentScore = baseScore - rankAdjustment;

        const existing = resultsMap.get(id);

        if (!existing || currentScore > existing.score) {
          resultsMap.set(id as string, {
            id: id as string,
            title: entry?.title || id,
            type: entry?.type,
            path: entry?.path || "",
            matchType: field === "keywords" ? "content" : (field as any),
            score: currentScore,
            excerpt:
              field === "content"
                ? this.getExcerpt(entry?.content || "", query)
                : existing?.excerpt,
          });
        }
      }
    }

    const processedResults = Array.from(resultsMap.values()).sort(
      (a, b) => b.score - a.score,
    );

    this.log("info", `Total processed results: ${processedResults.length}`);
    return processedResults;
  }

  /**
   * Search and return results. If more than 100 results, returns a Transferable ArrayBuffer.
   */
  async searchOptimized(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult[] | { data: Uint8Array; isEncoded: true }> {
    const results = await this.search(query, options);

    if (results.length > 100) {
      const encoder = new TextEncoder();
      const encoded = encoder.encode(JSON.stringify(results));
      return Comlink.transfer({ data: encoded, isEncoded: true }, [
        encoded.buffer,
      ]) as any;
    }

    return results;
  }

  private getExcerpt(content: string, query: string): string {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerContent.indexOf(lowerQuery);

    if (index === -1) return content.slice(0, 100);

    const start = Math.max(0, index - 40);
    const end = Math.min(content.length, index + query.length + 40);
    return (
      (start > 0 ? "..." : "") +
      content.slice(start, end) +
      (end < content.length ? "..." : "")
    );
  }

  clear() {
    this.taskQueue = this.taskQueue.then(async () => {
      this.log("info", "Clearing index...");
      this.docIds.clear();
      this.initIndex();
      this.notifyChange();
    });
    return this.taskQueue;
  }

  /**
   * Exports the index data as a set of key-value pairs.
   * FlexSearch exports are fragmented, so we collect them into an object.
   */
  async exportIndex(): Promise<Record<string, any>> {
    // Wait for all pending indexing tasks to finish
    await this.taskQueue;

    if (!this.index) return {};

    const data: Record<string, any> = { _docIds: Array.from(this.docIds) };
    let count = 0;

    // FlexSearch.Document.export is synchronous.
    this.index.export((key: any, value: any) => {
      if (key !== undefined && key !== null && value !== undefined) {
        data[key] = value;
        count++;
        // Periodic progress logging for large indexes
        if (count % 100 === 0) {
          this.log("info", `Exporting segments... (${count} so far)`);
        }
      }
    });

    this.log(
      "info",
      `Export complete. ${count} segments collected. Encoding...`,
    );

    const segments: Record<string, ArrayBuffer> = {};
    const transferables: ArrayBuffer[] = [];
    const encoder = new TextEncoder();
    let processed = 0;

    // Process segments individually to prevent massive V8 string allocation
    for (const [k, v] of Object.entries(data)) {
      const jsonStr = typeof v === "string" ? v : JSON.stringify(v);
      const buffer = encoder.encode(jsonStr).buffer;
      segments[k] = buffer;
      transferables.push(buffer);
      processed++;

      // Yield back to event loop every 50 segments so the worker can process search queries!
      if (processed % 50 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    this.log("info", `Encoding complete. Transferring binary payload...`);
    return Comlink.transfer(
      { isSegmented: true, segments, keyCount: count },
      transferables,
    );
  }

  /**
   * Imports a previously exported index.
   */
  async importIndex(data: any): Promise<void> {
    this.taskQueue = this.taskQueue.then(async () => {
      let parsedData = data;

      if (
        data &&
        typeof data === "object" &&
        data.isSegmented &&
        data.segments
      ) {
        try {
          parsedData = {};
          const decoder = new TextDecoder();
          let processed = 0;

          for (const [k, value] of Object.entries(data.segments)) {
            let buffer: any = value;
            let str: string;
            if (typeof buffer === "string") {
              str = buffer;
            } else {
              const isBinary =
                buffer &&
                typeof buffer === "object" &&
                (buffer instanceof ArrayBuffer ||
                  ArrayBuffer.isView(buffer) ||
                  buffer.constructor?.name === "ArrayBuffer" ||
                  buffer.constructor?.name === "Uint8Array" ||
                  "byteLength" in buffer);

              if (!isBinary) {
                if (Array.isArray(buffer)) {
                  buffer = new Uint8Array(buffer);
                } else {
                  const values = Object.values(buffer ?? {});
                  buffer = new Uint8Array(values as number[]);
                }
              }
              str = decoder.decode(buffer);
            }
            if (k === "_docIds") {
              const docIdsJson = str.trim();
              if (!docIdsJson) {
                this.log(
                  "warn",
                  "Segmented index data is missing document IDs; skipping import.",
                );
                return;
              }
              parsedData[k] = JSON.parse(docIdsJson);
            } else {
              parsedData[k] = str;
            }
            processed++;

            // Yield back to event loop every 50 segments during heavy imports
            if (processed % 50 === 0) {
              await new Promise((r) => setTimeout(r, 0));
            }
          }
        } catch (e) {
          this.log("error", "Failed to decode segmented index data", e);
          return;
        }
      } else if (
        data &&
        typeof data === "object" &&
        data.isEncoded &&
        data.data
      ) {
        // Fallback for previous monolithic encoded format
        try {
          let buffer: any = data.data;
          let decoded: string;
          if (typeof buffer === "string") {
            decoded = buffer;
          } else {
            const isBinary =
              buffer &&
              typeof buffer === "object" &&
              (buffer instanceof ArrayBuffer ||
                ArrayBuffer.isView(buffer) ||
                buffer.constructor?.name === "ArrayBuffer" ||
                buffer.constructor?.name === "Uint8Array" ||
                "byteLength" in buffer);

            if (!isBinary) {
              if (Array.isArray(buffer)) {
                buffer = new Uint8Array(buffer);
              } else {
                const values = Object.values(buffer ?? {});
                buffer = new Uint8Array(values as number[]);
              }
            }
            decoded = new TextDecoder().decode(buffer);
          }
          parsedData = JSON.parse(decoded);
        } catch (e) {
          this.log("error", "Failed to decode imported index data", e);
          return;
        }
      }

      if (!this.index) this.initIndex();
      if (parsedData._docIds !== undefined) {
        this.docIds = new Set(parsedData._docIds);
      }

      let count = 0;
      for (const [key, value] of Object.entries(parsedData)) {
        if (key === "_docIds") continue;
        // FlexSearch import is synchronous
        this.index.import(key, value);
        count++;
      }
      this.log(
        "info",
        `Index imported with ${this.docCount} documents (${count} segments).`,
      );
      this.notifyChange();
    });
    return this.taskQueue;
  }
}

// Expose the worker interface
export function exposeSearchEngine(engine: SearchEngine) {
  Comlink.expose(engine);
}

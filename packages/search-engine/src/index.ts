import FlexSearch from "flexsearch";
import type { SearchEntry, SearchResult, SearchOptions } from "schema";
import * as Comlink from "comlink";

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
    this.initIndex();
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
          resolution: 9,
        },
        {
          field: "keywords",
          tokenize: "full",
          optimize: true,
          resolution: 9,
        },
        {
          field: "content",
          tokenize: "forward",
          optimize: true,
          resolution: 5,
          minlength: 2,
        },
      ],
      store: ["id", "title", "path", "content", "type"],
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
    this.taskQueue = this.taskQueue.then(async () => {
      if (!this.index) {
        this.log("warn", "Index was null during addBatch(), re-initializing.");
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
    });
    return this.taskQueue;
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
      const field = fieldResult.field as "title" | "content" | "keywords";
      const isTitle = field === "title";
      const isKeywords = field === "keywords";
      const baseScore = isTitle ? 1.0 : isKeywords ? 0.8 : 0.5;

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

        const rankAdjustment = i * 0.0001;
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

    this.log("info", `Export complete. ${count} segments collected.`);
    return data;
  }

  /**
   * Imports a previously exported index.
   */
  async importIndex(data: Record<string, any>): Promise<void> {
    this.taskQueue = this.taskQueue.then(async () => {
      if (!this.index) this.initIndex();
      if (data._docIds !== undefined) {
        this.docIds = new Set(data._docIds);
      }

      let count = 0;
      for (const [key, value] of Object.entries(data)) {
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

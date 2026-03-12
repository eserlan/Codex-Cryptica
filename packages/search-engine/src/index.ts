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
  private onLog:
    | ((level: "info" | "warn" | "error", msg: string, data?: any) => void)
    | null = null;

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

  add(doc: SearchEntry) {
    if (!this.index) {
      this.log("warn", "Index was null during add(), re-initializing.");
      this.initIndex();
    }
    this.log("info", `Adding document: ${doc.id} (${doc.title})`);
    try {
      this.index.add(doc);
    } catch (err) {
      this.log("error", `Failed to add document ${doc.id}`, err);
    }
  }

  remove(id: string) {
    if (!this.index) return;
    this.log("info", `Removing document: ${id}`);
    this.index.remove(id);
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
    this.log("info", `Searching for: "${query}" with limit ${limit}`);
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
    this.log("info", "Clearing index...");
    this.initIndex();
  }
}

// Expose the worker interface
export function exposeSearchEngine(engine: SearchEngine) {
  Comlink.expose(engine);
}

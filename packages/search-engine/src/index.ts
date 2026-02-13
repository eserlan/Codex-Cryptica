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

  constructor() {
    this.initIndex();
  }

  initIndex() {
    const config: any = {
      id: "id",
      index: [
        {
          field: "title",
          tokenize: "forward",
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
          resolution: 9,
          minlength: 2,
          context: {
            depth: 3,
            resolution: 9,
          },
        },
      ],
      store: ["id", "title", "path", "content", "type"],
    };

    this.index = new FlexSearch.Document(config);
  }

  add(doc: SearchEntry) {
    if (!this.index) this.initIndex();
    this.index?.add(doc);
  }

  remove(id: string) {
    if (!this.index) return;
    this.index.remove(id);
  }

  async search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    if (!this.index) return [];

    const limit = options.limit || 20;
    const results = await this.index.searchAsync(query, {
      limit,
      enrich: true,
      suggest: true,
    });

    const resultsMap = new Map<string, SearchResult>();

    // Process results from all fields
    for (const fieldResult of results) {
      const field = fieldResult.field as "title" | "content" | "keywords";
      const isTitle = field === "title";
      const isKeywords = field === "keywords";
      const baseScore = isTitle ? 1.0 : isKeywords ? 0.8 : 0.5;

      for (let i = 0; i < fieldResult.result.length; i++) {
        const item = fieldResult.result[i];
        const { id, doc: entry } = extractIdAndDoc(item);

        if (!id) continue;

        const rankAdjustment = i * 0.0001;
        const currentScore = baseScore - rankAdjustment;

        const existing = resultsMap.get(id);

        if (!existing || currentScore > existing.score) {
          resultsMap.set(id, {
            id,
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
    this.index = null;
  }
}

// Expose the worker interface
export function exposeSearchEngine(engine: SearchEngine) {
  Comlink.expose(engine);
}

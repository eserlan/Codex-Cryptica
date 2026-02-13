import type { SearchEntry, SearchResult, SearchOptions } from "schema";
import * as Comlink from "comlink";
// We import the worker constructor using Vite's syntax
import SearchWorker from "../workers/search.worker?worker";
import type { SearchEngine } from "@codex/search-engine";

export class SearchService {
  private worker: Worker | null = null;
  private api: Comlink.Remote<SearchEngine> | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.worker = new SearchWorker();
      this.api = Comlink.wrap<SearchEngine>(this.worker);
      // Initialize immediately
      this.init();

      window.addEventListener("vault-switched", () => {
        this.worker?.terminate();
        this.worker = new SearchWorker();
        this.api = Comlink.wrap<SearchEngine>(this.worker);
        this.init();
      });
    }
  }

  async init(_options: { phonetic?: boolean } = {}): Promise<void> {
    if (!this.api) return;
    return this.api.initIndex();
  }

  async index(entry: SearchEntry): Promise<void> {
    if (!this.api) return;
    return this.api.add(entry);
  }

  async remove(id: string): Promise<void> {
    if (!this.api) return;
    return this.api.remove(id);
  }

  async search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    if (!this.api) return [];

    const rawResult = await this.api.searchOptimized(query, options);

    // Handle Transferable (Encoded) result
    if (
      typeof rawResult === "object" &&
      rawResult !== null &&
      "isEncoded" in rawResult
    ) {
      const decoder = new TextDecoder();
      const decoded = decoder.decode(rawResult.data);
      return JSON.parse(decoded);
    }

    return rawResult as SearchResult[];
  }

  async clear(): Promise<void> {
    if (!this.api) return;
    return this.api.clear();
  }
}

export const searchService = new SearchService();

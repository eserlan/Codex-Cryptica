import type { SearchEntry, SearchResult, SearchOptions } from "schema";
import * as Comlink from "comlink";
// We import the worker constructor using Vite's syntax
import SearchWorker from "../workers/search.worker?worker";
import type { SearchEngine } from "@codex/search-engine";
import { debugStore } from "../stores/debug.svelte";

export class SearchService {
  private worker: Worker | null = null;
  private api: Comlink.Remote<SearchEngine> | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.initWorker();
    }
  }

  private initWorker() {
    this.worker = new SearchWorker();
    this.api = Comlink.wrap<SearchEngine>(this.worker);

    // Bridge logs from worker to main thread log service
    this.api.setLogger(
      Comlink.proxy(
        (level: "info" | "warn" | "error", msg: string, data?: any) => {
          const message = `[SearchEngine] ${msg}`;
          if (level === "error") {
            debugStore.error(message, data);
          } else if (level === "warn") {
            debugStore.warn(message, data);
          } else {
            debugStore.log(message, data);
          }
        },
      ),
    );

    // Initialize immediately
    this.init();
  }

  terminate() {
    if (this.api) {
      this.api[Comlink.releaseProxy](); // Release the Comlink proxy
      this.api = null;
    }
    this.worker?.terminate();
    this.worker = null;
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

import type { SearchEntry, SearchResult, SearchOptions } from "schema";
// We import the worker constructor using Vite's syntax
import SearchWorker from "../workers/search.worker?worker";

export class SearchService {
  private worker: Worker | null = null;
  private pendingRequests = new Map<
    string,
    { resolve: (val: any) => void; reject: (err: any) => void }
  >();

  constructor() {
    if (typeof window !== "undefined") {
      this.worker = new SearchWorker();
      this.worker.onmessage = this.handleMessage.bind(this);
      // Initialize immediately
      this.init();
    }
  }

  private handleMessage(event: MessageEvent) {
    const { id, result, error } = event.data;
    const request = this.pendingRequests.get(id);

    if (request) {
      if (error) {
        request.reject(new Error(error));
      } else {
        request.resolve(result);
      }
      this.pendingRequests.delete(id);
    }
  }

  private postMessage<T>(type: string, payload?: any): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        // Fallback or error if server-side (though this service usually runs on client)
        // For SSR safety, we might just return a default or error
        // But typically this service is browser-only.
        reject(new Error("SearchService only available in browser"));
        return;
      }

      const id = crypto.randomUUID();
      this.pendingRequests.set(id, { resolve, reject });
      this.worker.postMessage({ type, id, payload });
    });
  }

  async init(options: { phonetic?: boolean } = {}): Promise<void> {
    if (!this.worker) return;
    return this.postMessage<void>("INIT", options);
  }

  async index(entry: SearchEntry): Promise<void> {
    if (!this.worker) return;
    return this.postMessage<void>("INDEX", entry);
  }

  async remove(id: string): Promise<void> {
    if (!this.worker) return;
    return this.postMessage<void>("REMOVE", id);
  }

  async search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    if (!this.worker) return [];
    return this.postMessage<SearchResult[]>("SEARCH", { query, options });
  }

  async clear(): Promise<void> {
    if (!this.worker) return;
    return this.postMessage<void>("CLEAR");
  }
}

export const searchService = new SearchService();

import * as Comlink from "comlink";
import ParserWorker from "../workers/parser.worker?worker";
import { marked } from "marked";
import type { ParserEngine } from "../workers/parser.worker";

const SIZE_THRESHOLD = 50 * 1024; // 50kb

export class ParserService {
  private worker: Worker | null = null;
  private api: Comlink.Remote<ParserEngine> | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.worker = new ParserWorker();
      this.api = Comlink.wrap<ParserEngine>(this.worker);

      window.addEventListener("vault-switched", () => {
        this.terminate();
        this.worker = new ParserWorker();
        this.api = Comlink.wrap<ParserEngine>(this.worker);
      });
    }
  }

  async parse(content: string): Promise<string> {
    if (content.length > SIZE_THRESHOLD && this.api) {
      return this.api.parse(content);
    }
    // Fallback to main thread for small files or if worker not available
    return marked.parse(content) as string;
  }

  async parseInline(content: string): Promise<string> {
    if (content.length > SIZE_THRESHOLD && this.api) {
      return this.api.parseInline(content);
    }
    return marked.parseInline(content) as string;
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
    this.api = null;
  }
}

export const parserService = new ParserService();

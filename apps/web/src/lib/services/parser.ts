import * as Comlink from "comlink";
import ParserWorker from "../workers/parser.worker?worker";
import { marked } from "marked";
import type { ParserEngine } from "../workers/parser.worker";

const SIZE_THRESHOLD = 50 * 1024; // 50kb

export class ParserService {
  private worker: Worker | null = null;
  private api: Comlink.Remote<ParserEngine> | null = null;

  private static current: ParserService | null = null;
  private static vaultListenerAttached = false;
  private static readonly handleVaultSwitched = () => {
    const current = ParserService.current;
    if (current) {
      current.terminate();
      current.initWorker();
    }
  };

  constructor() {
    if (typeof window !== "undefined") {
      this.initWorker();
      ParserService.current = this;

      if (!ParserService.vaultListenerAttached) {
        window.addEventListener(
          "vault-switched",
          ParserService.handleVaultSwitched,
        );
        ParserService.vaultListenerAttached = true;
      }
    }
  }

  private initWorker() {
    this.worker = new ParserWorker();
    this.api = Comlink.wrap<ParserEngine>(this.worker);
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
    this.api = null;
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
}

export const parserService = new ParserService();

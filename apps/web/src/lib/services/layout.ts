import * as Comlink from "comlink";
import LayoutWorker from "../workers/layout.worker?worker";
import type { LayoutEngine, LayoutResult } from "graph-engine";
import type { TimelineLayoutOptions } from "graph-engine/src/layouts/timeline";

export class LayoutService {
  private worker: Worker | null = null;
  private api: Comlink.Remote<LayoutEngine> | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.worker = new LayoutWorker();
      this.api = Comlink.wrap<LayoutEngine>(this.worker);

      window.addEventListener("vault-switched", () => {
        this.terminate();
        this.worker = new LayoutWorker();
        this.api = Comlink.wrap<LayoutEngine>(this.worker);
      });
    }
  }

  async runFcose(elements: any[], options: any = {}): Promise<LayoutResult> {
    if (!this.api) throw new Error("LayoutService not available");
    return this.api.runFcose(elements, options);
  }

  async runTimeline(
    nodes: any[],
    options: TimelineLayoutOptions,
  ): Promise<LayoutResult> {
    if (!this.api) throw new Error("LayoutService not available");
    return this.api.runTimeline(nodes, options);
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
    this.api = null;
  }
}

export const layoutService = new LayoutService();

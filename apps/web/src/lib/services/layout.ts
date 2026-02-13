import * as Comlink from "comlink";
import LayoutWorker from "../workers/layout.worker?worker";
import type { LayoutEngine, LayoutResult } from "graph-engine";
// NOTE: This import intentionally targets an internal `src` path of graph-engine
// because `TimelineLayoutOptions` is not exposed via the public package entrypoint.
// If graph-engine's internal layout structure changes, this import will need updating.
import type { TimelineLayoutOptions } from "graph-engine/src/layouts/timeline";

export class LayoutService {
  private worker: Worker | null = null;
  private api: Comlink.Remote<LayoutEngine> | null = null;

  private static current: LayoutService | null = null;
  private static vaultListenerAttached = false;
  private static readonly handleVaultSwitched = () => {
    const current = LayoutService.current;
    if (current) {
      current.terminate();
      current.initWorker();
    }
  };

  constructor() {
    if (typeof window !== "undefined") {
      this.initWorker();
      LayoutService.current = this;

      if (!LayoutService.vaultListenerAttached) {
        window.addEventListener(
          "vault-switched",
          LayoutService.handleVaultSwitched,
        );
        LayoutService.vaultListenerAttached = true;
      }
    }
  }

  private initWorker() {
    this.worker = new LayoutWorker();
    this.api = Comlink.wrap<LayoutEngine>(this.worker);
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

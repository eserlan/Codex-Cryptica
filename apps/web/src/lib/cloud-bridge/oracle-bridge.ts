import * as Comlink from "comlink";
import OracleWorker from "$lib/workers/oracle.worker?worker";
import { browser } from "$app/environment";
import type { TextGenerationService } from "schema";

/**
 * OracleBridge manages the lifecycle of the Oracle Web Worker
 * and provides a Comlink-wrapped proxy to its services.
 */
export class OracleBridge {
  private worker: Worker | null = null;
  private api: Comlink.Remote<any> | null = null;

  constructor() {
    if (browser) {
      this.initWorker();
    }
  }

  private initWorker() {
    this.worker = new OracleWorker();
    this.api = Comlink.wrap<any>(this.worker);
  }

  public get isReady(): boolean {
    return this.api !== null;
  }

  /**
   * Proxies all TextGenerationService methods to the worker.
   */
  public get textGeneration(): TextGenerationService {
    if (!this.api) {
        throw new Error("[OracleBridge] Worker not initialized");
    }
    return this.api as unknown as TextGenerationService;
  }

  /**
   * Proxies DraftingEngine methods to the worker.
   */
  public get draftingEngine(): any {
    if (!this.api) {
        throw new Error("[OracleBridge] Worker not initialized");
    }
    return this.api;
  }

  public terminate() {
    this.worker?.terminate();
    this.worker = null;
    this.api = null;
  }
}

export const oracleBridge = new OracleBridge();

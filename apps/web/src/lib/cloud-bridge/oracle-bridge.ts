import * as Comlink from "comlink";
import OracleWorker from "#lib/workers/oracle.worker?worker";
import { browser } from "$app/env";
import type { TextGenerationService } from "schema";
import type { CachedToken } from "@codex/ai-engine";

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
    try {
      this.worker = new OracleWorker();
      this.api = Comlink.wrap<any>(this.worker);
    } catch (err) {
      console.error("[OracleBridge] Failed to initialize OracleWorker:", err);
      this.worker = null;
      this.api = null;
    }
  }

  public get isReady(): boolean {
    return this.api !== null;
  }

  /**
   * Relays the main thread's session token snapshot into the worker — see
   * `session-bootstrap.ts`'s `onTokenChange` wiring and
   * `RelayedSessionToken` for why this is necessary (the worker has no DOM
   * and can't mint its own token).
   */
  public setSessionToken(token: CachedToken | null): void {
    this.api?.setSessionToken(token);
  }

  /**
   * Registers a Comlink-proxied hook the worker's `RelayedSessionToken` can
   * call to pull a fresh token snapshot from the main thread's real session
   * manager on demand — see `session-bootstrap.ts` and
   * `RelayedSessionToken.setPuller`.
   */
  public setTokenProvider(
    provider: (forceRefresh: boolean) => Promise<CachedToken | null>,
  ): void {
    this.api?.setSessionTokenProvider(Comlink.proxy(provider));
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

  public generateAdventureTurn(
    request: unknown,
    requestId: string,
    options?: { apiKey?: string; modelName?: string },
    onNarration?: (text: string) => void,
  ): Promise<unknown> {
    if (!this.api) throw new Error("[OracleBridge] Worker not initialized");
    // Proxy callbacks must be top-level Comlink arguments. If nested in the
    // request, postMessage attempts to clone the function and throws.
    return this.api.generateAdventureTurn(
      request,
      requestId,
      options,
      onNarration ? Comlink.proxy(onNarration) : undefined,
    );
  }

  public cancelAdventureTurn(requestId: string): Promise<void> {
    if (!this.api) throw new Error("[OracleBridge] Worker not initialized");
    return this.api.cancelAdventureTurn(requestId);
  }

  public clearAdventureInteraction(sessionId: string): Promise<void> {
    if (!this.api) throw new Error("[OracleBridge] Worker not initialized");
    return this.api.clearAdventureInteraction(sessionId);
  }

  public confirmAdventureInteraction(sessionId: string, revision?: number): Promise<void> {
    if (!this.api) throw new Error("[OracleBridge] Worker not initialized");
    return this.api.confirmAdventureInteraction(sessionId, revision);
  }

  public terminate() {
    if (this.api) {
      this.api[Comlink.releaseProxy]();
    }
    this.worker?.terminate();
    this.worker = null;
    this.api = null;
  }
}

export const oracleBridge = new OracleBridge();

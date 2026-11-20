import * as Comlink from "comlink";
import { browser } from "$app/env";
import type { TextGenerationService } from "schema";
import type { CachedToken } from "@codex/ai-engine";

const NOT_INITIALIZED = "[OracleBridge] Worker not initialized";

const defaultLoadWorker = (): Promise<Worker> =>
  import("#lib/workers/oracle.worker?worker").then((m) => new m.default());

/**
 * OracleBridge manages the lifecycle of the Oracle Web Worker
 * and provides a Comlink-wrapped proxy to its services. The worker is loaded
 * on the first real request, not at module load.
 */
export class OracleBridge {
  private worker: Worker | null = null;
  private api: Comlink.Remote<any> | null = null;
  private available = browser;
  private starting: Promise<Comlink.Remote<any>> | null = null;
  private readonly loadWorker: () => Promise<Worker>;
  private tokenProvider:
    ((forceRefresh: boolean) => Promise<CachedToken | null>) | null = null;
  private pendingToken: { value: CachedToken | null } | null = null;

  constructor(deps: { loadWorker?: () => Promise<Worker> } = {}) {
    this.loadWorker = deps.loadWorker ?? defaultLoadWorker;
  }

  /**
   * Starts the worker if needed. Concurrent callers share one load. Setup
   * calls made before start are applied before the first request is forwarded.
   */
  private ensureApi(): Promise<Comlink.Remote<any>> {
    if (this.api) return Promise.resolve(this.api);
    if (!this.available) return Promise.reject(new Error(NOT_INITIALIZED));
    this.starting ??= this.start();
    return this.starting;
  }

  private async start(): Promise<Comlink.Remote<any>> {
    let worker: Worker | null = null;
    try {
      worker = await this.loadWorker();
      if (!this.available) {
        throw new Error("OracleBridge terminated while loading");
      }
      const api = Comlink.wrap<any>(worker);
      this.worker = worker;
      this.api = api;
      if (this.tokenProvider) {
        api.setSessionTokenProvider(Comlink.proxy(this.tokenProvider));
      }
      if (this.pendingToken) {
        api.setSessionToken(this.pendingToken.value);
      }
      this.pendingToken = null;
      return api;
    } catch (err) {
      console.error("[OracleBridge] Failed to initialize OracleWorker:", err);
      worker?.terminate();
      this.worker = null;
      this.api = null;
      this.available = false;
      throw new Error(`${NOT_INITIALIZED}: ${String(err)}`, { cause: err });
    }
  }

  /** A stand-in whose methods start the worker, then forward the call. */
  private lazyService(): any {
    return new Proxy(
      {},
      {
        get: (_target, prop) => {
          if (typeof prop === "symbol" || prop === "then") return undefined;
          return (...args: unknown[]) =>
            this.ensureApi().then((api) => api[prop](...args));
        },
      },
    );
  }

  public get isReady(): boolean {
    return this.available;
  }

  /**
   * Relays the main thread's session token snapshot into the worker — see
   * `session-bootstrap.ts`'s `onTokenChange` wiring and
   * `RelayedSessionToken` for why this is necessary (the worker has no DOM
   * and can't mint its own token).
   */
  public setSessionToken(token: CachedToken | null): void {
    if (this.api) {
      this.api.setSessionToken(token);
    } else {
      this.pendingToken = { value: token };
    }
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
    this.tokenProvider = provider;
    this.api?.setSessionTokenProvider(Comlink.proxy(provider));
  }

  /**
   * Proxies all TextGenerationService methods to the worker.
   */
  public get textGeneration(): TextGenerationService {
    if (!this.available) throw new Error(NOT_INITIALIZED);
    return this.lazyService() as TextGenerationService;
  }

  /**
   * Proxies DraftingEngine methods to the worker.
   */
  public get draftingEngine(): any {
    if (!this.available) throw new Error(NOT_INITIALIZED);
    return this.lazyService();
  }

  public generateAdventureTurn(
    request: unknown,
    requestId: string,
    options?: { apiKey?: string; modelName?: string },
    onNarration?: (text: string) => void,
  ): Promise<unknown> {
    // Proxy callbacks must be top-level Comlink arguments. If nested in the
    // request, postMessage attempts to clone the function and throws.
    return this.ensureApi().then((api) =>
      api.generateAdventureTurn(
        request,
        requestId,
        options,
        onNarration ? Comlink.proxy(onNarration) : undefined,
      ),
    );
  }

  public summarizeAdventure(
    request: unknown,
    requestId: string,
    options?: { apiKey?: string; modelName?: string },
  ): Promise<unknown> {
    return this.ensureApi().then((api) =>
      api.summarizeAdventure(request, requestId, options),
    );
  }

  public cancelAdventureTurn(requestId: string): Promise<void> {
    return this.ensureApi().then((api) => api.cancelAdventureTurn(requestId));
  }

  public clearAdventureInteraction(sessionId: string): Promise<void> {
    return this.ensureApi().then((api) =>
      api.clearAdventureInteraction(sessionId),
    );
  }

  public confirmAdventureInteraction(
    sessionId: string,
    revision?: number,
  ): Promise<void> {
    return this.ensureApi().then((api) =>
      api.confirmAdventureInteraction(sessionId, revision),
    );
  }

  public terminate() {
    if (this.api) {
      this.api[Comlink.releaseProxy]();
    }
    this.worker?.terminate();
    this.worker = null;
    this.api = null;
    this.available = false;
  }
}

export const oracleBridge = new OracleBridge();

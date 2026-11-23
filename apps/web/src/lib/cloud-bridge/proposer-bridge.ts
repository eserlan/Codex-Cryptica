import { browser } from "$app/env";
import type { Proposal } from "@codex/proposer";
import {
  type IdGenerator,
  systemIdGenerator,
} from "#lib/utils/runtime-deps.js";
import type { CachedToken } from "@codex/ai-engine";
import { registerWorkerSessionBridge } from "./worker-session-bridge.js";

const defaultLoadWorker = (): Promise<Worker> =>
  import("#lib/workers/proposer.worker?worker").then((m) => new m.default());

export class ProposerBridge {
  private worker: Worker | null = null;
  private readonly idGenerator: IdGenerator;
  private pendingRequests = new Map<
    string,
    { resolve: (val: any) => void; reject: (err: any) => void }
  >();
  private tokenProvider:
    ((forceRefresh: boolean) => Promise<CachedToken | null>) | null = null;

  private readonly loadWorker: () => Promise<Worker>;
  private canStart = false;
  private starting: Promise<Worker | null> | null = null;
  private pendingToken: { value: CachedToken | null } | null = null;

  constructor(
    deps: {
      idGenerator?: IdGenerator;
      worker?: Worker | null;
      loadWorker?: () => Promise<Worker>;
    } = {},
  ) {
    this.idGenerator = deps.idGenerator ?? systemIdGenerator;
    this.loadWorker = deps.loadWorker ?? defaultLoadWorker;
    if (deps.worker !== undefined) {
      this.worker = deps.worker;
      if (this.worker) {
        this.attachWorkerHandler(this.worker);
      }
    } else {
      this.canStart = browser;
    }
  }

  private attachWorkerHandler(worker: Worker) {
    worker.onmessage = (event) => {
      const { type, payload, id } = event.data;
      if (type === "REQUEST_SESSION_TOKEN") {
        void this.respondToTokenRequest(
          worker,
          id,
          payload?.forceRefresh === true,
        );
        return;
      }
      if (id && this.pendingRequests.has(id)) {
        const { resolve, reject } = this.pendingRequests.get(id)!;
        if (type === "ERROR") {
          reject(new Error(payload));
        } else {
          resolve(payload);
        }
        this.pendingRequests.delete(id);
      }
    };
  }

  /**
   * Answers the worker's on-demand pull (`requestTokenFromMainThread()` in
   * `proposer.worker.ts`), fired when its `RelayedSessionToken` has nothing
   * valid cached — e.g. this worker was created before the main thread ever
   * minted a token. Resolves `null` when no provider is wired yet; the
   * worker treats that exactly like an unauthenticated request, same as
   * today.
   */
  private async respondToTokenRequest(
    worker: Worker,
    id: string,
    forceRefresh: boolean,
  ): Promise<void> {
    let token: CachedToken | null = null;
    try {
      token = this.tokenProvider
        ? await this.tokenProvider(forceRefresh)
        : null;
    } catch {
      // Always resolve the worker's correlated pull. A failed handshake is
      // represented as no token, matching the normal unauthenticated path.
    }
    worker.postMessage({ type: "SESSION_TOKEN_RESPONSE", id, payload: token });
  }

  /**
   * Registers the hook `respondToTokenRequest` calls to fetch a fresh token
   * snapshot from the main thread's real session manager — see
   * `session-bootstrap.ts`.
   */
  public setTokenProvider(
    provider: ((forceRefresh: boolean) => Promise<CachedToken | null>) | null,
  ): void {
    this.tokenProvider = provider;
  }

  /** Loads the worker once. Resolves null if the load fails. */
  private ensureWorker(): Promise<Worker | null> {
    this.starting ??= this.start();
    return this.starting;
  }

  private async start(): Promise<Worker | null> {
    try {
      const worker = await this.loadWorker();
      if (!this.canStart) {
        worker.terminate();
        return null;
      }
      this.worker = worker;
      this.attachWorkerHandler(worker);
      if (this.pendingToken) {
        worker.postMessage({
          type: "SESSION_TOKEN",
          payload: this.pendingToken.value,
        });
        this.pendingToken = null;
      }
      return worker;
    } catch (err) {
      console.error("[ProposerBridge] Failed to initialize worker:", err);
      this.canStart = false;
      return null;
    }
  }

  /**
   * Relays the main thread's session token snapshot into the worker — see
   * `session-bootstrap.ts`'s `onTokenChange` wiring and `RelayedSessionToken`
   * for why this is necessary (the worker has no DOM and can't mint its own
   * token). Fire-and-forget: no response expected.
   */
  public setSessionToken(token: CachedToken | null): void {
    if (this.worker) {
      this.worker.postMessage({ type: "SESSION_TOKEN", payload: token });
    } else if (this.canStart) {
      this.pendingToken = { value: token };
    }
  }

  public async analyzeEntity(
    apiKey: string,
    modelName: string,
    vaultId: string,
    entityId: string,
    content: string,
    availableTargets: { id: string; name: string }[],
  ): Promise<Proposal[]> {
    let worker = this.worker;
    if (!worker) {
      if (!this.canStart) return [];
      worker = await this.ensureWorker();
      if (!worker) return [];
    }

    const id = this.idGenerator.uuid();
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      worker.postMessage({
        type: "ANALYZE",
        id,
        payload: {
          apiKey,
          modelName,
          vaultId,
          entityId,
          content,
          availableTargets,
        },
      });
    });
  }

  public terminate() {
    // Reject all pending requests to avoid hanging promises when the worker is terminated.
    for (const [id, { reject }] of this.pendingRequests.entries()) {
      reject(
        new Error(`Proposer worker terminated while request ${id} was pending`),
      );
    }
    this.pendingRequests.clear();

    this.worker?.terminate();
    this.worker = null;
    this.canStart = false;
  }
}

export const proposerBridge = new ProposerBridge();
registerWorkerSessionBridge(proposerBridge);

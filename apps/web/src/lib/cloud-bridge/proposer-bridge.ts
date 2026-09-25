import ProposerWorker from "$lib/workers/proposer.worker?worker";
import { browser } from "$app/environment";
import type { Proposal } from "@codex/proposer";
import { type IdGenerator, systemIdGenerator } from "$lib/utils/runtime-deps";
import type { CachedToken } from "@codex/ai-engine";

export class ProposerBridge {
  private worker: Worker | null = null;
  private readonly idGenerator: IdGenerator;
  private pendingRequests = new Map<
    string,
    { resolve: (val: any) => void; reject: (err: any) => void }
  >();
  private tokenProvider: (() => Promise<CachedToken | null>) | null = null;

  constructor(
    deps: { idGenerator?: IdGenerator; worker?: Worker | null } = {},
  ) {
    this.idGenerator = deps.idGenerator ?? systemIdGenerator;
    if (deps.worker !== undefined) {
      this.worker = deps.worker;
      if (this.worker) {
        this.attachWorkerHandler(this.worker);
      }
    } else if (browser) {
      this.initWorker();
    }
  }

  private attachWorkerHandler(worker: Worker) {
    worker.onmessage = (event) => {
      const { type, payload, id } = event.data;
      if (type === "REQUEST_SESSION_TOKEN") {
        void this.respondToTokenRequest(worker, id);
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
  ): Promise<void> {
    const token = this.tokenProvider ? await this.tokenProvider() : null;
    worker.postMessage({ type: "SESSION_TOKEN_RESPONSE", id, payload: token });
  }

  /**
   * Registers the hook `respondToTokenRequest` calls to fetch a fresh token
   * snapshot from the main thread's real session manager — see
   * `session-bootstrap.ts`.
   */
  public setTokenProvider(
    provider: (() => Promise<CachedToken | null>) | null,
  ): void {
    this.tokenProvider = provider;
  }

  private initWorker() {
    this.worker = new ProposerWorker();
    this.attachWorkerHandler(this.worker);
  }

  /**
   * Relays the main thread's session token snapshot into the worker — see
   * `session-bootstrap.ts`'s `onTokenChange` wiring and `RelayedSessionToken`
   * for why this is necessary (the worker has no DOM and can't mint its own
   * token). Fire-and-forget: no response expected.
   */
  public setSessionToken(token: CachedToken | null): void {
    this.worker?.postMessage({ type: "SESSION_TOKEN", payload: token });
  }

  public async analyzeEntity(
    apiKey: string,
    modelName: string,
    vaultId: string,
    entityId: string,
    content: string,
    availableTargets: { id: string; name: string }[],
  ): Promise<Proposal[]> {
    if (!this.worker) return [];

    const id = this.idGenerator.uuid();
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.worker!.postMessage({
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
  }
}

export const proposerBridge = new ProposerBridge();

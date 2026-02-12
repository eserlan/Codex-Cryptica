import ProposerWorker from "$lib/workers/proposer.worker?worker";
import { browser } from "$app/environment";
import type { Proposal } from "@codex/proposer";

export class ProposerBridge {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();

  constructor() {
    if (browser) {
      this.initWorker();
    }
  }

  private initWorker() {
    this.worker = new ProposerWorker();
    this.worker.onmessage = (event) => {
      const { type, payload, id } = event.data;
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

  public async analyzeEntity(
    apiKey: string,
    modelName: string,
    entityId: string,
    content: string,
    availableTargets: { id: string; name: string }[]
  ): Promise<Proposal[]> {
    if (!this.worker) return [];

    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.worker!.postMessage({
        type: "ANALYZE",
        id,
        payload: { apiKey, modelName, entityId, content, availableTargets }
      });
    });
  }

  public terminate() {
    // Reject all pending requests to avoid hanging promises when the worker is terminated.
    for (const [id, { reject }] of this.pendingRequests.entries()) {
      reject(new Error(`Proposer worker terminated while request ${id} was pending`));
    }
    this.pendingRequests.clear();

    this.worker?.terminate();
    this.worker = null;
  }
}

export const proposerBridge = new ProposerBridge();

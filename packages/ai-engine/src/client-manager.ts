import type {
  GoogleGenerativeAI as GoogleGenerativeAIType,
  GenerativeModel,
} from "@google/generative-ai";
import { AuthenticatedProxy } from "./authenticated-proxy";
import { DirectAIClient } from "./direct-ai-client";
import { ProxyInteractions } from "./proxy-interactions";
import { createProxyModel } from "./proxy-model";
import type { SessionTokenSource } from "./session-manager";

export {
  InteractionExpiredError,
  INTERACTION_MODEL_KEY,
  GENERATOR_INTERACTION_MODEL_KEY,
} from "./proxy-interactions";
export type { GenerationEvent } from "./proxy-generation-stream";

/** Composes direct SDK access and the authenticated proxy adapters. */
export class DefaultAIClientManager {
  private directClient = new DirectAIClient();

  // Proxy configuration
  private static get PROXY_URL() {
    return (
      (typeof import.meta !== "undefined" &&
        import.meta.env?.VITE_ORACLE_PROXY_URL) ||
      "https://oracle-proxy.espen-erlandsen.workers.dev"
    );
  }

  private proxy: AuthenticatedProxy;

  constructor(
    fetcher: typeof fetch = (input, init) => fetch(input, init),
    sessionManager: SessionTokenSource | null = null,
  ) {
    this.proxy = new AuthenticatedProxy(fetcher, sessionManager);
  }

  /** Wired at app startup, when the challenge solver has access to the DOM. */
  setSessionManager(sessionManager: SessionTokenSource | null): void {
    this.proxy.setSessionManager(sessionManager);
  }

  async sendInteraction(params: Parameters<ProxyInteractions["send"]>[0]) {
    return new ProxyInteractions(
      DefaultAIClientManager.PROXY_URL,
      this.proxy.fetch,
    ).send(params);
  }

  async *sendInteractionStream(
    params: Parameters<ProxyInteractions["stream"]>[0],
  ) {
    yield* new ProxyInteractions(
      DefaultAIClientManager.PROXY_URL,
      this.proxy.fetch,
    ).stream(params);
  }

  async getClient(apiKey: string): Promise<GoogleGenerativeAIType> {
    return this.directClient.getClient(apiKey);
  }

  async getModel(
    apiKey: string,
    modelName: string,
    systemInstruction?: string,
  ): Promise<GenerativeModel> {
    if (!apiKey) {
      return createProxyModel(modelName, systemInstruction, {
        getProxyUrl: () => DefaultAIClientManager.PROXY_URL,
        doFetch: this.proxy.fetch,
      });
    }
    const client = await this.getClient(apiKey);
    return client.getGenerativeModel({ model: modelName, systemInstruction });
  }
}

export const aiClientManager = new DefaultAIClientManager();

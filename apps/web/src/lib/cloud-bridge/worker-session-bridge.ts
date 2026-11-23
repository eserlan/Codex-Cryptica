import type { CachedToken } from "@codex/ai-engine";

export type WorkerTokenProvider = (
  forceRefresh: boolean,
) => Promise<CachedToken | null>;

export interface WorkerSessionBridge {
  setSessionToken(token: CachedToken | null): void;
  setTokenProvider(provider: WorkerTokenProvider): void;
}

const bridges = new Set<WorkerSessionBridge>();
let currentToken: CachedToken | null = null;
let tokenProvider: WorkerTokenProvider | null = null;

export function registerWorkerSessionBridge(bridge: WorkerSessionBridge): void {
  bridges.add(bridge);
  bridge.setSessionToken(currentToken);
  if (tokenProvider) bridge.setTokenProvider(tokenProvider);
}

export function relaySessionToken(token: CachedToken | null): void {
  currentToken = token;
  for (const bridge of bridges) bridge.setSessionToken(token);
}

export function installWorkerTokenProvider(
  provider: WorkerTokenProvider,
): void {
  tokenProvider = provider;
  for (const bridge of bridges) bridge.setTokenProvider(provider);
}

import { browser } from "$app/env";
import {
  AiSessionManager,
  aiClientManager,
  type CachedToken,
} from "@codex/ai-engine";
import { getSessionTurnstileToken } from "#lib/services/publishing/turnstile.js";

const PROXY_URL =
  import.meta.env.VITE_ORACLE_PROXY_URL ||
  "https://oracle-proxy.espen-erlandsen.workers.dev";

export function requiresCapabilitySession(proxyUrl: string): boolean {
  if (!import.meta.env.DEV) return true;

  const hostname = new URL(proxyUrl).hostname;
  return hostname !== "localhost" && hostname !== "127.0.0.1";
}

let sessionManager: AiSessionManager | null = null;
let tokenRelay: ((token: CachedToken | null) => void) | null = null;

export function setSessionTokenRelay(
  cb: ((token: CachedToken | null) => void) | null,
): void {
  tokenRelay = cb;
}

function yieldForPaint(): Promise<void> {
  if (!browser || typeof requestAnimationFrame !== "function") {
    return Promise.resolve();
  }
  return new Promise((resolve) =>
    requestAnimationFrame(() => setTimeout(resolve, 0)),
  );
}

function ensureSessionManager(): AiSessionManager | null {
  if (!browser || !requiresCapabilitySession(PROXY_URL)) return null;
  if (!sessionManager) {
    sessionManager = new AiSessionManager({
      proxyUrl: PROXY_URL,
      solveChallenge: async () => {
        await yieldForPaint();
        return getSessionTurnstileToken();
      },
      onTokenChange: (token) => tokenRelay?.(token),
    });
    aiClientManager.setSessionManager(sessionManager);
  }
  return sessionManager;
}

/**
 * Lazily wires the shared `aiClientManager` to the capability-token session
 * manager without solving Turnstile or issuing a network request.
 */
export function ensurePublicAiSession(): AiSessionManager | null {
  return ensureSessionManager();
}

/**
 * Bearer token for callers that talk to the proxy directly instead of through
 * `aiClientManager` (the contextual help assistant, #3427). Resolves `null`
 * when no session is required (a local development proxy) or none could be
 * obtained; the proxy is the authority on whether that is acceptable.
 *
 * `forceRefresh` discards the cached token first, for the one retry after a
 * 401 that `aiClientManager` also makes.
 */
export async function getAiSessionToken(
  forceRefresh = false,
): Promise<string | null> {
  const manager = ensureSessionManager();
  if (!manager) return null;
  if (forceRefresh) manager.invalidate();
  return manager.getToken();
}

/**
 * Resolves a fresh capability-token snapshot for worker pull requests,
 * running the Turnstile handshake if none is cached yet.
 */
export function getAiSessionSnapshot(
  forceRefresh = false,
): Promise<CachedToken | null> {
  const manager = ensureSessionManager();
  return manager
    ? manager.getTokenSnapshot(forceRefresh)
    : Promise.resolve(null);
}

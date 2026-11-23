import { browser } from "$app/env";
import type {
  AiSessionManager as AiSessionManagerType,
  CachedToken,
} from "@codex/ai-engine/session-manager";
import { getSessionTurnstileToken } from "#lib/services/publishing/turnstile.js";
import {
  installWorkerTokenProvider,
  relaySessionToken,
} from "#lib/cloud-bridge/worker-session-bridge.js";
import { loadConfiguredAIEngine } from "#lib/services/ai/ai-engine-loader.js";

/**
 * Wires the shared `aiClientManager` to a session manager that mints
 * anti-abuse capability tokens.
 *
 * This is the only place the web app touches the token flow. Attachment,
 * queueing and refresh all live inside `@codex/ai-engine` — the app just
 * supplies the DOM-bound Turnstile solve, which that package can't do
 * itself.
 *
 * `initAiSession()` wires the shared `aiClientManager` and both worker pull/push
 * hooks app-wide without loading Turnstile or issuing a challenge.
 * `aiClientManager` is a module singleton shared by *every* caller, including
 * the public no-login generators under `(marketing)/generators` and
 * `(marketing)/tools` (see `services/seo/generator-engine.ts`). Those pages
 * generate without ever mounting the `(app)` layout, so wiring happens app-wide
 * while the first AI or proxy call triggers the Turnstile handshake lazily.
 *
 * The Oracle and Proposer AI Web Workers each carry their own isolated
 * `aiClientManager` instance (Workers don't share module state with the main
 * thread) and have no DOM, so neither can solve a Turnstile challenge or
 * mint a token itself. `onTokenChange` below relays every mint/refresh/clear
 * from this, the one real session manager, into both workers — see
 * `RelayedSessionToken` in `@codex/ai-engine` for the worker-side half.
 *
 * That push alone leaves a race: a worker created (or a relayed token that
 * expires) between two pushes has nothing valid cached until the next one
 * fires. `provideTokenSnapshot` below closes it — it's wired into both
 * bridges as a pull hook a worker can call immediately before it sends a
 * request, instead of only being pushed to.
 */

const PROXY_URL =
  import.meta.env.VITE_ORACLE_PROXY_URL ||
  "https://oracle-proxy.espen-erlandsen.workers.dev";

export function requiresCapabilitySession(proxyUrl: string): boolean {
  if (!import.meta.env.DEV) return true;

  const hostname = new URL(proxyUrl).hostname;
  return hostname !== "localhost" && hostname !== "127.0.0.1";
}

type AiSessionManager = AiSessionManagerType;

let sessionManager: AiSessionManager | null = null;
let sessionManagerPromise: Promise<AiSessionManager | null> | null = null;
let workerTokenProvidersRegistered = false;

function relayTokenToWorkers(token: CachedToken | null): void {
  relaySessionToken(token);
}

/**
 * Answers a Worker's on-demand pull (see `RelayedSessionToken.setPuller`)
 * with a fresh token snapshot, running the Turnstile handshake if none is
 * cached yet. This is what closes the residual race `onTokenChange`/
 * `relayTokenToWorkers` alone can't: a Worker created, or a relayed token
 * that expires, between two pushes now asks for a snapshot immediately
 * before its next request instead of waiting on the next mint/refresh/clear.
 */
async function provideTokenSnapshot(
  forceRefresh = false,
): Promise<CachedToken | null> {
  const manager = await ensureSessionManager();
  return manager ? manager.getTokenSnapshot(forceRefresh) : null;
}

function registerWorkerTokenProviders(): void {
  if (workerTokenProvidersRegistered) return;
  workerTokenProvidersRegistered = true;
  installWorkerTokenProvider(provideTokenSnapshot);
}

function ensureSessionManager(): Promise<AiSessionManager | null> {
  registerWorkerTokenProviders();
  if (!browser) return Promise.resolve(null);
  if (sessionManager) return Promise.resolve(sessionManager);
  if (sessionManagerPromise) return sessionManagerPromise;

  sessionManagerPromise = loadConfiguredAIEngine()
    .then(async () => {
      if (!requiresCapabilitySession(PROXY_URL)) return null;
      try {
        const [{ AiSessionManager }, { aiClientManager }] = await Promise.all([
          import("@codex/ai-engine/session-manager"),
          import("@codex/ai-engine/client-manager"),
        ]);
        const manager = new AiSessionManager({
          proxyUrl: PROXY_URL,
          solveChallenge: getSessionTurnstileToken,
          onTokenChange: relayTokenToWorkers,
        });
        sessionManager = manager;
        aiClientManager.setSessionManager(manager);
        return manager;
      } catch (error) {
        sessionManagerPromise = null;
        console.warn(
          "[AI session] Failed to load capability session support.",
          error,
        );
        return null;
      }
    })
    .catch((error: unknown) => {
      sessionManagerPromise = null;
      throw error;
    });
  return sessionManagerPromise;
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
  const manager = await ensureSessionManager();
  if (!manager) return null;
  if (forceRefresh) manager.invalidate();
  return manager.getToken();
}

/**
 * Wire the token flow without solving a challenge.
 *
 * Cheap and side-effect-free, so it belongs on every page: a visitor reading
 * the blog costs nothing, but if they wander into a public generator the
 * token is minted on demand and the manager queues the request behind it.
 */
export async function initAiSession(): Promise<void> {
  registerWorkerTokenProviders();
}

/** Prepare the session only when an AI operation is about to use the proxy. */
export async function ensureAiSession(): Promise<void> {
  registerWorkerTokenProviders();
  await ensureSessionManager();
}

// A worker may make its first proxy request before app boot finishes awaiting
// the session chunks. Install the pull bridge as soon as this shared module is
// imported; its provider queues behind the same retryable setup promise.
registerWorkerTokenProviders();

import { browser } from "$app/environment";
import { AiSessionManager, aiClientManager } from "@codex/ai-engine";
import { getSessionTurnstileToken } from "$lib/services/publishing/turnstile";

/**
 * Wires the shared `aiClientManager` to a session manager that mints
 * anti-abuse capability tokens.
 *
 * This is the only place the web app touches the token flow. Attachment,
 * queueing and refresh all live inside `@codex/ai-engine` — the app just
 * supplies the DOM-dependent Turnstile solve, which that package can't do
 * itself.
 */

const PROXY_URL =
  import.meta.env.VITE_ORACLE_PROXY_URL ||
  "https://oracle-proxy.espen-erlandsen.workers.dev";

let initialized = false;

export function initAiSession(): void {
  if (!browser || initialized) return;
  initialized = true;

  const sessionManager = new AiSessionManager({
    proxyUrl: PROXY_URL,
    solveChallenge: getSessionTurnstileToken,
  });

  aiClientManager.setSessionManager(sessionManager);

  // Warm the token immediately so the first generation doesn't pay for the
  // handshake. Failures are non-fatal: a generation that arrives without a
  // token still reaches the proxy, which decides whether to reject it.
  void sessionManager.getToken();
}

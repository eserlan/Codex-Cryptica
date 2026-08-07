import { browser } from "$app/environment";
import { AiSessionManager, aiClientManager } from "@codex/ai-engine";
import { getSessionTurnstileToken } from "$lib/services/publishing/turnstile";

/**
 * Wires the shared `aiClientManager` to a session manager that mints
 * anti-abuse capability tokens.
 *
 * This is the only place the web app touches the token flow. Attachment,
 * queueing and refresh all live inside `@codex/ai-engine` — the app just
 * supplies the DOM-bound Turnstile solve, which that package can't do
 * itself.
 *
 * Wiring is separate from warming because the two have different reach.
 * `aiClientManager` is a module singleton shared by *every* caller, including
 * the public no-login generators under `(marketing)/generators` and
 * `(marketing)/tools` (see `services/seo/generator-engine.ts`). Those pages
 * generate without ever mounting the `(app)` layout, so wiring has to happen
 * app-wide or their requests go out unauthenticated and get 401'd.
 */

const PROXY_URL =
  import.meta.env.VITE_ORACLE_PROXY_URL ||
  "https://oracle-proxy.espen-erlandsen.workers.dev";

let sessionManager: AiSessionManager | null = null;

function ensureSessionManager(): AiSessionManager | null {
  if (!browser) return null;
  if (!sessionManager) {
    sessionManager = new AiSessionManager({
      proxyUrl: PROXY_URL,
      solveChallenge: getSessionTurnstileToken,
    });
    aiClientManager.setSessionManager(sessionManager);
  }
  return sessionManager;
}

/**
 * Wire the token flow without solving a challenge.
 *
 * Cheap and side-effect-free, so it belongs on every page: a visitor reading
 * the blog costs nothing, but if they wander into a public generator the
 * token is minted on demand and the manager queues the request behind it.
 */
export function initAiSession(): void {
  ensureSessionManager();
}

/**
 * Wire *and* pre-solve, so the first generation doesn't wait on a handshake.
 *
 * Only for surfaces where generation is the point — issuing a challenge to
 * someone who may never generate is a wasted Turnstile solve.
 */
export function initAiSessionEager(): void {
  const manager = ensureSessionManager();
  // Failures are non-fatal: a request that arrives without a token still
  // reaches the proxy, which decides whether to reject it.
  if (manager) void manager.getToken();
}

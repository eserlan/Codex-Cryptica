/**
 * Client half of the LLM session capability token flow.
 *
 * Obtains a signed token from oracle-proxy's `/api/session` by solving an
 * invisible Turnstile challenge, caches it for the session, and hands it to
 * {@link DefaultAIClientManager} to attach to every proxy call.
 *
 * Lives in `@codex/ai-engine` rather than the web app on purpose: the client
 * manager next door already owns every proxy request (operation pipeline,
 * interactions, legacy passthrough), so token handling belongs beside it. Put
 * anywhere else it becomes a second AI transport layer that some call sites
 * quietly bypass.
 *
 * The Turnstile solve itself is injected — this package has no DOM or
 * SvelteKit dependency, and tests supply a fake instead of a real widget.
 */

/** Solves an invisible Turnstile challenge, resolving with the challenge token. */
export type ChallengeSolver = () => Promise<string>;

/**
 * Shape `DefaultAIClientManager.proxyFetch` actually needs from a session
 * manager. `AiSessionManager` (the real, Turnstile-capable one) satisfies it,
 * and so does {@link RelayedSessionToken} — the two are interchangeable from
 * the client manager's point of view.
 */
export interface SessionTokenSource {
  getToken(): Promise<string | null>;
  invalidate(): void;
}

export interface CachedToken {
  token: string;
  expiresAt: number;
}

export interface AiSessionManagerOptions {
  proxyUrl: string;
  solveChallenge: ChallengeSolver;
  fetcher?: typeof fetch;
  /** Defaults to `sessionStorage` in the browser, absent elsewhere. */
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  now?: () => number;
  /**
   * Fired whenever the cached token changes — minted, refreshed, or cleared
   * (`null`). This is the hook that lets a token minted here (main thread,
   * the only place that can run Turnstile) reach the AI Web Workers, which
   * each carry their own isolated `aiClientManager` instance and have no DOM
   * to solve a challenge themselves. See {@link RelayedSessionToken}.
   */
  onTokenChange?: (token: CachedToken | null) => void;
}

const STORAGE_KEY = "codex.llm-session-token";

/**
 * Refresh this many seconds before the server-side expiry. Without the skew a
 * token that expires in transit produces an avoidable 401 round-trip.
 */
const EXPIRY_SKEW_SECONDS = 30;

export class AiSessionManager {
  private cached: CachedToken | null = null;

  /**
   * The in-flight handshake, if one is running.
   *
   * This single promise is what makes queueing work: every generation request
   * that arrives before the first handshake resolves awaits this same promise
   * and fires the moment the token lands. No explicit queue, no dropped
   * requests, and concurrent callers never trigger duplicate Turnstile solves.
   */
  private inFlight: Promise<string | null> | null = null;

  private readonly proxyUrl: string;
  private readonly solveChallenge: ChallengeSolver;
  private readonly fetcher: typeof fetch;
  private readonly storage: AiSessionManagerOptions["storage"];
  private readonly now: () => number;
  private readonly onTokenChange?: (token: CachedToken | null) => void;

  constructor(options: AiSessionManagerOptions) {
    this.proxyUrl = options.proxyUrl;
    this.solveChallenge = options.solveChallenge;
    this.fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
    this.storage =
      options.storage !== undefined ? options.storage : defaultStorage();
    this.now = options.now ?? (() => Date.now());
    this.onTokenChange = options.onTokenChange;
    this.cached = this.readStoredToken();
  }

  /**
   * Current capability token, minting one if needed.
   *
   * Resolves `null` when a token cannot be obtained (challenge failed, proxy
   * unconfigured). Callers send the request unauthenticated in that case
   * rather than blocking generation outright — the proxy is the authority on
   * whether a token is required, and it fails open until its signing secret
   * is set.
   */
  async getToken(): Promise<string | null> {
    const cached = this.cached;
    if (cached && !this.isExpiring(cached)) return cached.token;

    if (!this.inFlight) {
      this.inFlight = this.handshake().finally(() => {
        this.inFlight = null;
      });
    }
    return this.inFlight;
  }

  /**
   * Discard the current token so the next {@link getToken} re-handshakes.
   * Called when the proxy reports the token expired.
   */
  invalidate(): void {
    this.cached = null;
    try {
      this.storage?.removeItem(STORAGE_KEY);
    } catch {
      // A storage write failing (private mode, quota) must not break generation.
    }
    this.onTokenChange?.(null);
  }

  private isExpiring(token: CachedToken): boolean {
    return token.expiresAt - EXPIRY_SKEW_SECONDS <= this.now() / 1000;
  }

  private async handshake(): Promise<string | null> {
    try {
      const turnstileToken = await this.solveChallenge();
      const response = await this.fetcher(`${this.proxyUrl}/api/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turnstileToken }),
      });

      if (!response.ok) {
        console.warn(
          `[AiSession] Session handshake failed: ${response.status}`,
        );
        return null;
      }

      const data = (await response.json()) as {
        token?: string;
        expiresAt?: number;
      };
      if (!data?.token) return null;

      this.cached = {
        token: data.token,
        // Servers that omit expiresAt still get a sane local lifetime rather
        // than a token treated as immediately stale (which would re-handshake
        // on every single request).
        expiresAt: data.expiresAt ?? this.now() / 1000 + 30 * 60,
      };
      this.writeStoredToken(this.cached);
      this.onTokenChange?.(this.cached);
      return this.cached.token;
    } catch (error) {
      console.warn("[AiSession] Session handshake error:", error);
      return null;
    }
  }

  private readStoredToken(): CachedToken | null {
    try {
      const raw = this.storage?.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CachedToken;
      if (typeof parsed?.token !== "string") return null;
      if (typeof parsed?.expiresAt !== "number") return null;
      return this.isExpiring(parsed) ? null : parsed;
    } catch {
      return null;
    }
  }

  private writeStoredToken(token: CachedToken): void {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(token));
    } catch {
      // Non-fatal: the in-memory copy still serves this page load.
    }
  }
}

/**
 * `sessionStorage`, never `localStorage`: the token should die with the tab
 * rather than persist on disk for the next person at the machine.
 */
function defaultStorage(): AiSessionManagerOptions["storage"] {
  try {
    return typeof sessionStorage !== "undefined" ? sessionStorage : null;
  } catch {
    return null;
  }
}

/**
 * A {@link SessionTokenSource} for contexts that can't run Turnstile
 * themselves — namely the AI Web Workers (`oracle.worker.ts`,
 * `proposer.worker.ts`). Each worker gets its own isolated module graph and
 * therefore its own separate `aiClientManager` instance; none of them have a
 * `document`, so none can solve a challenge or mint a token on their own.
 *
 * This class holds no logic beyond "remember the last value I was told" —
 * the main thread's real `AiSessionManager` (via its `onTokenChange` hook)
 * is what actually mints and refreshes tokens; this just relays the result
 * across the Worker boundary. `getToken()` returns `null` once the relayed
 * token is expiring, same skew as `AiSessionManager`, so a worker never
 * knowingly sends a request with a token that's about to be rejected.
 */
export class RelayedSessionToken implements SessionTokenSource {
  private cached: CachedToken | null = null;
  private readonly now: () => number;

  constructor(now: () => number = () => Date.now()) {
    this.now = now;
  }

  /** Called by the worker's message handler whenever the main thread relays a new snapshot. */
  setToken(token: CachedToken | null): void {
    this.cached = token;
  }

  async getToken(): Promise<string | null> {
    const cached = this.cached;
    if (!cached) return null;
    if (cached.expiresAt - EXPIRY_SKEW_SECONDS <= this.now() / 1000) {
      return null;
    }
    return cached.token;
  }

  /**
   * A relay has nothing local to discard beyond its cached snapshot — the
   * real invalidation (and re-handshake) happens on the main thread, which
   * will relay the fresh token back via {@link setToken} once it lands.
   */
  invalidate(): void {
    this.cached = null;
  }
}

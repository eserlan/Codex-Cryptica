import type { SessionTokenSource } from "./session-manager";

/** Adds `Authorization: Bearer <token>` without disturbing existing headers. */
function withBearerToken(
  init: RequestInit | undefined,
  token: string | null,
): RequestInit | undefined {
  if (!token) return init;
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return { ...init, headers };
}

/** Attaches capability tokens and replays a replayable 401 request once. */
export class AuthenticatedProxy {
  constructor(
    private fetcher: typeof fetch = (input, init) => fetch(input, init),
    private sessionManager: SessionTokenSource | null = null,
  ) {}

  setSessionManager(sessionManager: SessionTokenSource | null): void {
    this.sessionManager = sessionManager;
  }

  readonly fetch: typeof fetch = async (input, init) => {
    const manager = this.sessionManager;
    if (!manager) return this.fetcher(input, init);

    const token = await manager.getToken();
    const response = await this.fetcher(input, withBearerToken(init, token));

    if (response.status !== 401) return response;
    // Only string bodies can be replayed safely; a consumed stream cannot.
    // Every proxy call site sends JSON strings, so this is a guard, not a
    // limitation in practice.
    if (init?.body !== undefined && typeof init.body !== "string") {
      return response;
    }

    manager.invalidate();
    const freshToken = await manager.getToken();
    if (!freshToken) return response;

    return this.fetcher(input, withBearerToken(init, freshToken));
  };
}

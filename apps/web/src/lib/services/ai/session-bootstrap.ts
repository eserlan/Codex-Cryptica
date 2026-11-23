import {
  installWorkerTokenProvider,
  relaySessionToken,
} from "#lib/cloud-bridge/worker-session-bridge.js";

/**
 * Attaches worker push/pull capability-token relays to the shared session
 * manager owned by `public-session-bootstrap.ts`.
 *
 * Called on `(app)` layout mount so marketing and root layouts never pull in
 * worker bridges (`oracleBridge` / `proposerBridge`).
 */

export function requiresCapabilitySession(proxyUrl: string): boolean {
  if (!import.meta.env.DEV) return true;

  const hostname = new URL(proxyUrl).hostname;
  return hostname !== "localhost" && hostname !== "127.0.0.1";
}

export async function getAiSessionToken(
  forceRefresh = false,
): Promise<string | null> {
  const { getAiSessionToken: getToken } =
    await import("./public-session-bootstrap.js");
  return getToken(forceRefresh);
}

async function attachWorkerSessionRelays(): Promise<void> {
  const { ensurePublicAiSession, getAiSessionSnapshot, setSessionTokenRelay } =
    await import("./public-session-bootstrap.js");
  setSessionTokenRelay(relaySessionToken);
  const manager = ensurePublicAiSession();
  if (!manager) return;
  installWorkerTokenProvider(getAiSessionSnapshot);
}

/**
 * Wire the shared capability-token manager and both worker push/pull hooks
 * without solving Turnstile or issuing a network request.
 */
export async function initAiSession(): Promise<void> {
  await attachWorkerSessionRelays();
}

/** Prepare the capability session and worker relays before an AI operation. */
export async function ensureAiSession(): Promise<void> {
  await attachWorkerSessionRelays();
}

import type { CachedToken } from "@codex/ai-engine";
import { oracleBridge } from "#lib/cloud-bridge/oracle-bridge.js";
import { proposerBridge } from "#lib/cloud-bridge/proposer-bridge.js";
import {
  ensurePublicAiSession,
  getAiSessionSnapshot,
  getAiSessionToken,
  requiresCapabilitySession,
  setSessionTokenRelay,
} from "./public-session-bootstrap.js";

/**
 * Attaches worker push/pull capability-token relays to the shared session
 * manager owned by `public-session-bootstrap.ts`.
 *
 * Called on `(app)` layout mount so marketing and root layouts never pull in
 * worker bridges (`oracleBridge` / `proposerBridge`).
 */

export { requiresCapabilitySession, getAiSessionToken };

function relayTokenToWorkers(token: CachedToken | null): void {
  oracleBridge.setSessionToken(token);
  proposerBridge.setSessionToken(token);
}

/**
 * Wire the shared capability-token manager and both worker push/pull hooks
 * without solving Turnstile or issuing a network request.
 */
export function initAiSession(): void {
  setSessionTokenRelay(relayTokenToWorkers);
  const manager = ensurePublicAiSession();
  if (!manager) return;
  oracleBridge.setTokenProvider(getAiSessionSnapshot);
  proposerBridge.setTokenProvider(getAiSessionSnapshot);
}

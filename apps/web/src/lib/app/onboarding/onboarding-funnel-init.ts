/**
 * Wires the onboarding funnel (#1786) to the internal vault event bus so the
 * "first entity" and "first link" milestones are recorded without coupling the
 * core mutation code to analytics.
 *
 * Demo bulk-loads deliberately do NOT emit vault events (see
 * `vault/lifecycle.ts`), so these milestones only fire for genuine user
 * actions. Guest sessions are read-only and cannot emit them either.
 *
 * The funnel de-dupes, so subscribing to every BATCH_CREATED / CONNECTION_ADDED
 * is fine — only the first of each is recorded.
 */

import { vaultEventBus } from "$lib/stores/vault/events.svelte";
import { onboardingFunnel } from "./onboarding-funnel";

let unsubscribe: (() => void) | null = null;

export function initOnboardingFunnel() {
  // Idempotent — safe to call more than once (e.g. HMR, re-mount).
  if (unsubscribe) return unsubscribe;

  unsubscribe = vaultEventBus.subscribe((event) => {
    switch (event.type) {
      case "BATCH_CREATED":
        if (event.entities.length > 0) {
          onboardingFunnel.track("first_entity");
        }
        break;
      case "CONNECTION_ADDED":
        onboardingFunnel.track("first_link");
        break;
      default:
        break;
    }
  }, "onboarding-funnel");

  return unsubscribe;
}

export function teardownOnboardingFunnel() {
  unsubscribe?.();
  unsubscribe = null;
}

/**
 * Cloudflare Zaraz event tracking (#1796).
 *
 * Fails silently by design: tracking must never be able to block generation,
 * saving, or navigation, and must be a no-op when Zaraz isn't loaded/blocked
 * (ad blockers, consent tools, local dev). Every event is merged with
 * whatever attribution (see attribution.ts) is currently on record.
 *
 * Scope: wired only from the (marketing) route group — see
 * (marketing)/+layout.svelte. Never called from anywhere inside the actual
 * app; see the module docstring on generator-save-tracking.ts for why.
 *
 * `initCodexAnalyticsBridge()` additionally fulfills the forwarding hook
 * onboarding-funnel.ts already documents and calls
 * (`window.__codexAnalytics.track`) — but since that bridge is only ever
 * defined here, on marketing pages, onboarding-funnel events (which only
 * fire from inside the actual app) never reach Zaraz through it. Nothing
 * needs to change there; this is just picking up an already-designed,
 * previously-unfulfilled extension point.
 */

import { attributionStore } from "./attribution";

interface ZarazLike {
  track: (eventName: string, properties?: Record<string, unknown>) => void;
}

function getZaraz(win: any): ZarazLike | undefined {
  return win?.zaraz;
}

/**
 * Emits a Zaraz custom event, merged with current attribution. No-ops
 * silently when `window.zaraz` isn't present or throws.
 */
export function trackEvent(
  name: string,
  properties: Record<string, unknown> = {},
  win: any = typeof window !== "undefined" ? window : undefined,
): void {
  try {
    const zaraz = getZaraz(win);
    if (!zaraz || typeof zaraz.track !== "function") return;

    const firstTouch = attributionStore.getFirstTouch();
    const latestTouch = attributionStore.getLatestTouch();

    zaraz.track(name, {
      ...properties,
      ...(firstTouch ? { first_touch: firstTouch } : {}),
      ...(latestTouch ? { latest_touch: latestTouch } : {}),
    });
  } catch {
    // tracking must never break the page
  }
}

let bridgeInitialized = false;

/**
 * Defines `window.__codexAnalytics.track`, the forwarding hook
 * onboarding-funnel.ts already calls. Idempotent — safe to call more than
 * once (e.g. HMR, re-mount).
 */
export function initCodexAnalyticsBridge(
  win: any = typeof window !== "undefined" ? window : undefined,
): void {
  if (!win || bridgeInitialized) return;
  try {
    win.__codexAnalytics = {
      ...(win.__codexAnalytics ?? {}),
      track: (eventName: string, payload?: Record<string, unknown>) =>
        trackEvent(eventName, payload, win),
    };
    bridgeInitialized = true;
  } catch {
    // never let analytics wiring break the app
  }
}

/** Resets the bridge-initialized guard. Primarily for tests. */
export function resetCodexAnalyticsBridge(): void {
  bridgeInitialized = false;
}

/**
 * Onboarding funnel instrumentation (#1777 / #1786).
 *
 * Emits the milestones a first-time user passes through so completion rates can
 * be compared before/after onboarding changes:
 *
 *   welcome_shown → demo_started → vault_created → first_entity → first_link
 *                 → graph_opened
 *
 * These are intentionally coarse, privacy-respecting signals: a step name and a
 * timestamp. No entity content, titles, or identifiers are ever included —
 * consistent with the app's local-first, nothing-uploaded stance.
 *
 * Milestones fire at most once (persisted in localStorage), so `first_entity`
 * and `first_link` are genuinely the first, and a returning user doesn't
 * re-emit steps they already completed. This makes the persisted set a simple
 * funnel-completion record.
 *
 * The tracker forwards to `window.__codexAnalytics.track` when present (a
 * hook explicitly wired only from the (marketing) layout, see
 * `$lib/services/analytics/zaraz-analytics.ts`) and logs to the debug store.
 *
 * It deliberately does NOT forward through a GTM-style `window.dataLayer`,
 * even though that's a common "ambient pipeline" pattern: Cloudflare Zaraz
 * auto-defines `window.dataLayer` site-wide the moment it's enabled (a GTM
 * migration-compatibility shim), on every route, regardless of anything this
 * app's own code does. A `dataLayer.push` forwarder here would silently leak
 * every in-app milestone unconditionally the instant Zaraz is turned on —
 * which is exactly what happened in #1796 before this was removed. The
 * existing Cloudflare Web Analytics beacon only records pageviews and has no
 * custom-event API, so funnel events deliberately do not depend on it either.
 */

import { browserStorage, type StorageLike } from "$lib/utils/runtime-deps";
import { debugStore } from "$lib/stores/debug.svelte";

export const ONBOARDING_FUNNEL_STEPS = [
  "welcome_shown",
  "demo_started",
  "vault_created",
  "first_entity",
  "first_link",
  "graph_opened",
] as const;

export type OnboardingFunnelStep = (typeof ONBOARDING_FUNNEL_STEPS)[number];

const STORAGE_KEY = "codex-cryptica-onboarding-funnel";

/** A destination for funnel events. */
export type FunnelSink = (
  step: OnboardingFunnelStep,
  payload: { step: OnboardingFunnelStep; at: number },
) => void;

interface FunnelDeps {
  storage?: StorageLike;
  now?: () => number;
  /** Extra sinks to notify in addition to the default page-pipeline forwarder. */
  sinks?: FunnelSink[];
  /** Window-like object for discovering an ambient analytics pipeline. */
  win?: any;
}

export class OnboardingFunnel {
  private storage: StorageLike;
  private now: () => number;
  private sinks: FunnelSink[];
  private win: any;
  private fired: Set<OnboardingFunnelStep>;

  constructor(deps: FunnelDeps = {}) {
    this.storage = deps.storage ?? browserStorage;
    this.now = deps.now ?? Date.now;
    this.win = deps.win ?? (typeof window !== "undefined" ? window : undefined);
    this.sinks = deps.sinks ?? [];
    this.fired = this.load();
  }

  private load(): Set<OnboardingFunnelStep> {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(
          parsed.filter((s): s is OnboardingFunnelStep =>
            (ONBOARDING_FUNNEL_STEPS as readonly string[]).includes(s),
          ),
        );
      }
    } catch {
      // ignore corrupt state — treat as a fresh funnel
    }
    return new Set();
  }

  private persist() {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify([...this.fired]));
    } catch {
      // storage unavailable (private mode / quota) — tracking is best-effort
    }
  }

  /** Whether a given milestone has already been recorded. */
  hasFired(step: OnboardingFunnelStep): boolean {
    return this.fired.has(step);
  }

  /** The set of milestones recorded so far (funnel-completion record). */
  completed(): OnboardingFunnelStep[] {
    return [...this.fired];
  }

  /**
   * Record a milestone. No-ops if it has already fired. Returns true if this
   * call recorded the step for the first time.
   */
  track(step: OnboardingFunnelStep): boolean {
    if (this.fired.has(step)) return false;
    this.fired.add(step);
    this.persist();

    const payload = { step, at: this.now() };

    // 1. Local visibility. Suppressed under test to avoid console output during
    // teardown, which aggravates a known vitest rpc teardown flake.
    if (import.meta.env?.MODE !== "test") {
      debugStore.log(`[OnboardingFunnel] ${step}`, payload);
    }

    // 2. The __codexAnalytics bridge, if present. Never window.dataLayer —
    // see the module docstring for why that one is unconditionally unsafe.
    try {
      const w = this.win;
      if (typeof w?.__codexAnalytics?.track === "function") {
        w.__codexAnalytics.track("onboarding_funnel", payload);
      }
    } catch {
      // never let analytics break the app
    }

    // 3. Explicitly-registered sinks (tests, future pipelines).
    for (const sink of this.sinks) {
      try {
        sink(step, payload);
      } catch {
        // isolate sink failures
      }
    }

    return true;
  }

  /** Clears recorded milestones. Primarily for tests. */
  reset() {
    this.fired = new Set();
    try {
      this.storage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

/** Shared singleton used by the app; tests can construct their own instance. */
export const onboardingFunnel = new OnboardingFunnel();

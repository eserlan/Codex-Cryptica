/**
 * First-run onboarding orchestrator (#1777 / #1780).
 *
 * A single, pure decision function that owns "what does the user see first?".
 * Previously this logic was spread across competing `$effect`s in
 * `(app)/+layout.svelte` — an auto tour/demo trigger and a separate changelog
 * trigger — which could stack or fight for the first moments of a session
 * (welcome layer, tour, demo hijack, changelog, theme prompt).
 *
 * By funnelling every input through one function we guarantee a first-time
 * user gets exactly ONE coherent path, and we make the behaviour unit-testable
 * without a DOM.
 *
 * Key behaviour changes vs. the old effects:
 * - An empty *user* vault is no longer hijacked by an auto-loaded demo
 *   (#1782). It returns `guided-empty`, which starts the short task-focused
 *   tour and lets the graph's guided empty state do the teaching.
 * - The changelog only surfaces for returning users when nothing else is
 *   competing for attention (no active tour, no open modal) (#1780).
 */

export type FirstRunAction =
  /** Do nothing this tick. */
  | { kind: "none" }
  /** Start the `initial-onboarding` guided tour. */
  | { kind: "tour" }
  /**
   * Empty, freshly-created *user* vault: run the guided first-entity flow
   * (short tour + graph empty-state checklist) instead of loading a demo.
   */
  | { kind: "guided-empty" }
  /** Returning user has an unseen release — show the changelog. */
  | { kind: "changelog" };

export interface FirstRunState {
  /** Vault store has finished initializing. */
  isInitialized: boolean;
  /** Viewing a shared/published world as a guest. */
  isGuestMode: boolean;
  /** Currently in a throwaway demo session. */
  isDemoMode: boolean;
  /** The welcome/marketing landing layer is still on screen. */
  isLandingVisible: boolean;
  /** The vault switcher modal is open (user is mid-create/open). */
  vaultSwitcherOpen: boolean;
  /** A `?demo=` query param is present (deep-link into a demo). */
  hasDemoQueryParam: boolean;
  /** The user has already completed the initial onboarding tour. */
  hasSeenTour: boolean;
  /** Number of entities in the active vault. */
  entityCount: number;
  /** A guided tour is already running. */
  activeTour: boolean;
  /** Any modal is currently open. */
  anyModalOpen: boolean;
  /** There is a release the user has not seen yet. */
  hasUnseenRelease: boolean;
}

/**
 * Decide the single first-run action for the current state. Pure — no side
 * effects, no DOM, no store access. Callers map the result onto store calls.
 */
export function decideFirstRunAction(state: FirstRunState): FirstRunAction {
  // Never intrude on: an un-booted app, guests, active demos, the landing
  // layer, a deep-linked demo, or a user actively picking a vault.
  if (
    !state.isInitialized ||
    state.isGuestMode ||
    state.isDemoMode ||
    state.isLandingVisible ||
    state.hasDemoQueryParam ||
    state.vaultSwitcherOpen
  ) {
    return { kind: "none" };
  }

  // Highest priority: a user who has not been onboarded yet.
  if (!state.hasSeenTour) {
    // Don't restart a tour that is already running (the caller re-evaluates
    // when activeTour changes, which would otherwise reset it to step 0), and
    // don't launch over an open modal — either would contradict the
    // "never stack or compete" goal. Wait for the next evaluation instead.
    if (state.activeTour || state.anyModalOpen) {
      return { kind: "none" };
    }
    // An empty vault they created themselves — guide them to a first entity
    // rather than silently swapping in a demo world (#1782).
    if (state.entityCount === 0) {
      return { kind: "guided-empty" };
    }
    return { kind: "tour" };
  }

  // Returning, onboarded user: only surface the changelog when nothing else is
  // competing for their attention (#1780).
  if (state.hasUnseenRelease && !state.activeTour && !state.anyModalOpen) {
    return { kind: "changelog" };
  }

  return { kind: "none" };
}

/**
 * Returns true if any of `releases` is a newer minor than `lastSeenVersion`.
 * Mirrors the semver-minor comparison the layout previously did inline, but as
 * a testable pure helper. A missing/blank `lastSeenVersion` means "brand-new
 * user" and returns false (first-timers get no changelog popup).
 */
export function hasUnseenMinorRelease(
  lastSeenVersion: string | null | undefined,
  releaseVersions: string[],
): boolean {
  if (!lastSeenVersion) return false;
  const seenMinor = parseInt(lastSeenVersion.split(".")[1] || "0", 10);
  return releaseVersions.some((v) => {
    const minor = parseInt(v.split(".")[1] || "0", 10);
    return minor > seenMinor;
  });
}

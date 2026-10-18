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
 * Key behaviour:
 * - A user who is not onboarded gets the goal invitation (spec 175), never an
 *   auto-started tour, whatever their vault holds. The tour only starts from
 *   an explicit tap.
 * - The changelog only surfaces for returning users when nothing else is
 *   competing for attention (no tour, modal or guided-setup journey) (#1780).
 */

export type FirstRunAction =
  /** Do nothing this tick. */
  | { kind: "none" }
  /** Show the goal invitation (Build a world, Write a story, ...). */
  | { kind: "goal-invitation" }
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
  /** The goal invitation was answered, explored or closed on this device. */
  goalInvitationResolved: boolean;
  /** A guided-setup journey card is showing. */
  journeyActive: boolean;
  /** A guided tour is already running. */
  activeTour: boolean;
  /** Any modal is currently open. */
  anyModalOpen: boolean;
  /** There is a release the user has not seen yet. */
  hasUnseenRelease: boolean;
}

/**
 * "Onboarded" for every first-run prompt: the old tour was completed, or the
 * goal invitation was answered, explored or closed (FR-003a).
 */
export function isOnboarded(s: {
  hasSeenTour: boolean;
  goalInvitationResolved: boolean;
}): boolean {
  return s.hasSeenTour || s.goalInvitationResolved;
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

  const busy = state.activeTour || state.anyModalOpen || state.journeyActive;

  // Highest priority: a user who has not been onboarded yet. Wait rather than
  // open over a tour, a modal or a journey ("never stack or compete").
  if (!isOnboarded(state)) {
    return busy ? { kind: "none" } : { kind: "goal-invitation" };
  }

  // Returning, onboarded user: only surface the changelog when nothing else is
  // competing for their attention (#1780).
  if (state.hasUnseenRelease && !busy) {
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

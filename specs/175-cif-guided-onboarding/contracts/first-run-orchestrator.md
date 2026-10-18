# Contract: first-run decision (`decideFirstRunAction`)

File: `apps/web/src/lib/app/onboarding/onboarding-orchestrator.ts`. It stays pure: no DOM, no stores.

## Types (after this change)

```ts
export type FirstRunAction =
  | { kind: "none" }
  | { kind: "goal-invitation" } // replaces "tour" and "guided-empty"
  | { kind: "changelog" };

export interface FirstRunState {
  // existing
  isInitialized: boolean;
  isGuestMode: boolean;
  isDemoMode: boolean;
  isLandingVisible: boolean;
  vaultSwitcherOpen: boolean;
  hasDemoQueryParam: boolean;
  hasSeenTour: boolean;
  activeTour: boolean;
  anyModalOpen: boolean;
  hasUnseenRelease: boolean;
  // new
  goalInvitationResolved: boolean; // onboardingStore.goalInvitation !== null
  journeyActive: boolean; // a journey card is showing
  // removed: entityCount (clarification Q2: vault content does not matter)
}
```

## `isOnboarded` (new export)

```ts
export function isOnboarded(s: {
  hasSeenTour: boolean;
  goalInvitationResolved: boolean;
}): boolean; // hasSeenTour || goalInvitationResolved
```

The decision table uses it, and so does the vault theme prompt in `(app)/+layout.svelte` (FR-003a).

## Decision table (evaluated top to bottom; the first match wins)

| #   | Condition                                                                                                             | Result            |
| --- | --------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 1   | `!isInitialized \|\| isGuestMode \|\| isDemoMode \|\| isLandingVisible \|\| hasDemoQueryParam \|\| vaultSwitcherOpen` | `none`            |
| 2   | not onboarded (`!hasSeenTour && !goalInvitationResolved`) and (`activeTour \|\| anyModalOpen \|\| journeyActive`)     | `none` (wait)     |
| 3   | not onboarded                                                                                                         | `goal-invitation` |
| 4   | `hasUnseenRelease && !activeTour && !anyModalOpen && !journeyActive`                                                  | `changelog`       |
| 5   | otherwise                                                                                                             | `none`            |

## Caller obligations (`OnboardingHost.svelte`, extracted from `(app)/+layout.svelte`)

- `goal-invitation` → show `GoalInvitation`. Never start the tour.
- The invitation counts as "showing" for `anyModalOpen`-style suppression of other first-run prompts (theme prompt, changelog).
- The tour starts only from an explicit tap: "Take the short tour" after Explore, or the existing Help replay button.
- `OnboardingHost` sets `onboardingStore.firstRunGuidanceActive` while the invitation is open or `journeyActive`. The mobile graph coach marks and the vault theme prompt wait while it is true (research R7, FR-003a).
- The vault theme prompt uses `isOnboarded()` in place of `helpStore.hasSeen("initial-onboarding")`.

## Required test cases

Unit tests cover each row and `isOnboarded`'s truth table, plus: an empty vault and a populated vault both give `goal-invitation` (Q2); a user with `hasSeenTour` never gets it (Story 1, scenario 5); `journeyActive` defers the changelog; a converted demo (`isDemoMode` false, entries present, not onboarded) gets the invitation.

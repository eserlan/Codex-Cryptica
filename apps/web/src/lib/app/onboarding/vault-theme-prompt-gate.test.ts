import { describe, expect, it } from "vitest";
import {
  shouldConsiderVaultThemePrompt,
  type VaultThemePromptState,
} from "./vault-theme-prompt-gate";

const ready: VaultThemePromptState = {
  isBrowser: true,
  isInitialized: true,
  isDocumentVisible: true,
  activeVaultId: "v1",
  isDemoMode: false,
  isGuestMode: false,
  isLandingVisible: false,
  dismissedWorldPage: true,
  showChangelog: false,
  hasSeenTour: true,
  goalInvitationResolved: false,
  firstRunGuidanceActive: false,
  activeTour: false,
  anyModalOpen: false,
};

describe("shouldConsiderVaultThemePrompt", () => {
  it("allows the prompt for an onboarded user with nothing else showing", () => {
    expect(shouldConsiderVaultThemePrompt(ready)).toBe(true);
  });

  it("allows it for a user who answered the invitation but never took the tour", () => {
    expect(
      shouldConsiderVaultThemePrompt({
        ...ready,
        hasSeenTour: false,
        goalInvitationResolved: true,
      }),
    ).toBe(true);
  });

  it("blocks a user who is not onboarded yet", () => {
    expect(
      shouldConsiderVaultThemePrompt({ ...ready, hasSeenTour: false }),
    ).toBe(false);
  });

  it.each([
    ["outside the browser", { isBrowser: false }],
    ["before the vault is ready", { isInitialized: false }],
    ["while the tab is hidden", { isDocumentVisible: false }],
    ["without a vault", { activeVaultId: null }],
    ["in a demo", { isDemoMode: true }],
    ["as a guest", { isGuestMode: true }],
    ["over the landing layer", { isLandingVisible: true }],
    ["before the world page is dismissed", { dismissedWorldPage: false }],
    ["over the changelog", { showChangelog: true }],
    [
      "during the goal invitation or a journey",
      { firstRunGuidanceActive: true },
    ],
    ["during a tour", { activeTour: true }],
    ["over a modal", { anyModalOpen: true }],
  ])("waits %s", (_label, patch) => {
    expect(shouldConsiderVaultThemePrompt({ ...ready, ...patch })).toBe(false);
  });
});

import { isOnboarded } from "./onboarding-orchestrator";

/** Everything the vault theme prompt waits on, read by the layout. */
export interface VaultThemePromptState {
  isBrowser: boolean;
  isInitialized: boolean;
  isDocumentVisible: boolean;
  activeVaultId: string | null;
  isDemoMode: boolean;
  isGuestMode: boolean;
  isLandingVisible: boolean;
  dismissedWorldPage: boolean;
  showChangelog: boolean;
  hasSeenTour: boolean;
  goalInvitationResolved: boolean;
  /** The goal invitation is open or a guided-setup journey runs. */
  firstRunGuidanceActive: boolean;
  activeTour: boolean;
  anyModalOpen: boolean;
}

/**
 * Whether the vault theme prompt may be considered now. Pure, so the rules are
 * testable without the layout. A user who answered the goal invitation never
 * takes the old tour, so "onboarded" comes from `isOnboarded` (FR-003a).
 */
export function shouldConsiderVaultThemePrompt(
  s: VaultThemePromptState,
): boolean {
  return (
    s.isBrowser &&
    s.isInitialized &&
    s.isDocumentVisible &&
    !!s.activeVaultId &&
    !s.isDemoMode &&
    !s.isGuestMode &&
    !s.isLandingVisible &&
    s.dismissedWorldPage &&
    !s.showChangelog &&
    isOnboarded(s) &&
    !s.firstRunGuidanceActive &&
    !s.activeTour &&
    !s.anyModalOpen
  );
}

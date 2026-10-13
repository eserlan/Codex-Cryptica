import type { HelpArea } from "help-engine";
import type {
  GoalInvitationAnswer,
  Goal,
  TipBlockers,
} from "onboarding-journey-engine";

/** Everything the tip decision reads from the app, supplied by the runtime. */
export interface TipContext {
  goal: Goal | null;
  goalInvitation: GoalInvitationAnswer | null;
  setupEnded: boolean;
  area: HelpArea;
  unavailableAreas: readonly HelpArea[];
  blockers: TipBlockers;
}

/** Raw app state, gathered by the runtime. No branching lives in the gathering. */
export interface TipSources {
  chosenGoal: Goal | null;
  goalInvitation: GoalInvitationAnswer | null;
  setupEnded: boolean;
  area: HelpArea;
  generatorsOffered: boolean;
  typing: boolean;
  anyModalOpen: boolean;
  zenMode: boolean;
  tourActive: boolean;
  firstRunGuidanceActive: boolean;
  cifPanelOpen: boolean;
  cifPopoutConnected: boolean;
  // What the graph route reads to decide whether the front page shows.
  vaultInitialized: boolean;
  skipWelcomeScreen: boolean;
  worldPageDismissed: boolean;
  entitySelected: boolean;
}

/**
 * The vault's front page ("Start your world") covers the graph: the same
 * condition the graph route uses to render it.
 */
export function frontPageShowing(s: TipSources): boolean {
  return (
    s.area === "graph" &&
    s.vaultInitialized &&
    s.skipWelcomeScreen &&
    !s.worldPageDismissed &&
    !s.entitySelected
  );
}

/** Pure: turns app state into the context the tip decision reads (no DOM, no stores). */
export function tipContextFrom(s: TipSources): TipContext {
  return {
    goal: s.chosenGoal,
    goalInvitation: s.goalInvitation,
    setupEnded: s.setupEnded,
    area: s.area,
    unavailableAreas: s.generatorsOffered ? [] : ["generators"],
    blockers: {
      typing: s.typing,
      dialogOpen: s.anyModalOpen || s.zenMode,
      tourActive: s.tourActive,
      journeyOrInvitationActive: s.firstRunGuidanceActive,
      cifOpen: s.cifPanelOpen || s.cifPopoutConnected,
      firstRunPage: frontPageShowing(s),
    },
  };
}

import { GOALS, type Goal } from "onboarding-journey-engine";
import type { UIPersistence } from "./persistence";
import {
  UIPersistence as DefaultPersistence,
  UI_STORAGE_KEYS,
} from "./persistence";

export type GoalInvitationAnswer = "goal" | "explore" | "dismissed";
const ANSWERS: readonly GoalInvitationAnswer[] = [
  "goal",
  "explore",
  "dismissed",
];

export class OnboardingStore {
  private persistence: UIPersistence;
  private getNow: () => number;

  skipWelcomeScreen = $state(false);
  dismissedLandingPage = $state(false);
  dismissedWorldPage = $state(false);
  worldPageDismissedAt = $state<number | null>(null);
  lastSeenVersion = $state<string | null>(null);
  showChangelog = $state(false);
  dismissedMobileGraphCoachMarks = $state(false);
  /** How the goal invitation was answered on this device (spec 175). */
  goalInvitation = $state<GoalInvitationAnswer | null>(null);
  /** The goal the user last picked. Never inferred from vault content. */
  chosenGoal = $state<Goal | null>(null);
  /**
   * Not persisted. True while the goal invitation is open or a guided-setup
   * journey runs, so other first-run prompts (theme prompt, phone coach
   * marks) wait.
   */
  firstRunGuidanceActive = $state(false);

  constructor(
    persistence: UIPersistence = new DefaultPersistence(),
    getNow: () => number = Date.now,
  ) {
    this.persistence = persistence;
    this.getNow = getNow;

    this.skipWelcomeScreen = this.persistence.read(
      UI_STORAGE_KEYS.SKIP_LANDING,
      (v) => v === "true",
      false,
    );
    this.dismissedLandingPage = this.persistence.read(
      UI_STORAGE_KEYS.DISMISSED_LANDING,
      (v) => v === "true",
      false,
    );

    const worldDismissed = this.persistence.read(
      UI_STORAGE_KEYS.WORLD_PAGE_DISMISSED_AT,
      (v) => parseInt(v, 10),
      null,
    );
    if (worldDismissed !== null) {
      const now = this.getNow();
      if (Number.isNaN(worldDismissed) || worldDismissed > now) {
        this.persistence.remove(UI_STORAGE_KEYS.WORLD_PAGE_DISMISSED_AT);
      } else if (now - worldDismissed < 24 * 60 * 60 * 1000) {
        this.dismissedWorldPage = true;
        this.worldPageDismissedAt = worldDismissed;
      } else {
        // Expired (> 24h)
        this.persistence.remove(UI_STORAGE_KEYS.WORLD_PAGE_DISMISSED_AT);
      }
    }

    this.lastSeenVersion = this.persistence.read(
      UI_STORAGE_KEYS.LAST_SEEN_VERSION,
      (v) => v,
      null,
    );

    this.dismissedMobileGraphCoachMarks = this.persistence.read(
      UI_STORAGE_KEYS.MOBILE_GRAPH_COACH_MARKS_SEEN,
      (v) => v === "true",
      false,
    );

    this.goalInvitation = this.persistence.read(
      UI_STORAGE_KEYS.GOAL_INVITATION,
      (v) => (ANSWERS.includes(v as GoalInvitationAnswer) ? v : null),
      null,
    ) as GoalInvitationAnswer | null;
    this.chosenGoal = this.persistence.read(
      UI_STORAGE_KEYS.CHOSEN_GOAL,
      (v) => (GOALS.includes(v as Goal) ? (v as Goal) : null),
      null,
    );
  }

  /** Records how the invitation was answered, so it never shows again. */
  resolveGoalInvitation(answer: GoalInvitationAnswer) {
    this.goalInvitation = answer;
    this.persistence.write(UI_STORAGE_KEYS.GOAL_INVITATION, answer, String);
  }

  /** Remembers the goal on this device only (FR-007). */
  chooseGoal(goal: Goal) {
    this.chosenGoal = goal;
    this.persistence.write(UI_STORAGE_KEYS.CHOSEN_GOAL, goal, String);
  }

  get isLandingPageVisible() {
    return !this.skipWelcomeScreen && !this.dismissedLandingPage;
  }

  markVersionAsSeen(version: string) {
    this.lastSeenVersion = version;
    this.persistence.write(UI_STORAGE_KEYS.LAST_SEEN_VERSION, version, String);
  }

  toggleWelcomeScreen(skip: boolean) {
    this.skipWelcomeScreen = skip;
    this.persistence.write(UI_STORAGE_KEYS.SKIP_LANDING, skip, String);
  }

  dismissLandingPage() {
    this.dismissedLandingPage = true;
    this.persistence.write(UI_STORAGE_KEYS.DISMISSED_LANDING, true, String);
  }

  dismissWorldPage() {
    this.dismissedWorldPage = true;
    const now = this.getNow();
    this.worldPageDismissedAt = now;
    this.persistence.write(
      UI_STORAGE_KEYS.WORLD_PAGE_DISMISSED_AT,
      now,
      String,
    );
  }

  dismissMobileGraphCoachMarks() {
    this.dismissedMobileGraphCoachMarks = true;
    this.persistence.write(
      UI_STORAGE_KEYS.MOBILE_GRAPH_COACH_MARKS_SEEN,
      true,
      String,
    );
  }

  restoreWorldPage() {
    this.dismissedWorldPage = false;
    this.worldPageDismissedAt = null;
    this.persistence.remove(UI_STORAGE_KEYS.WORLD_PAGE_DISMISSED_AT);
  }
}

const KEY = "__codex_onboarding_store__";
export const onboardingStore: OnboardingStore =
  (globalThis as any)[KEY] ??
  ((globalThis as any)[KEY] = new OnboardingStore());

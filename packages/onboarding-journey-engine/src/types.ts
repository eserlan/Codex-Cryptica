import type { GuidanceAction } from "help-engine";

/** What the user wants to do first. Chosen explicitly, kept on the device. */
export type Goal = "world" | "story" | "campaign";
export const GOALS: readonly Goal[] = ["world", "story", "campaign"];

/** A choice on the goal invitation. `explore` never has a journey. */
export type InvitationChoice = Goal | "explore";

export type JourneyId = "worldbuilder" | "writer" | "rpg-gm";
export type StepId = string;

/**
 * An observable, content-free event. No field carries a name, text, entry id,
 * connection id or label. `at` comes from the injected clock and is only
 * compared with the journey's `startedAt`.
 */
export type Milestone =
  | { kind: "entry-created"; category: string; at: number }
  | { kind: "connection-added"; at: number }
  | { kind: "generator-saved"; at: number }
  | { kind: "entry-found"; at: number }
  | { kind: "screen"; area: "graph"; at: number };

/** What completes a step. `categories` omitted means any new entry. */
export type MilestoneMatcher =
  | { kind: "entry-created"; categories?: string[] }
  | { kind: "connection-added" }
  | { kind: "generator-saved" }
  | { kind: "entry-found" }
  | { kind: "screen"; area: "graph" };

export interface StepDefinition {
  id: StepId;
  /** What to do, in plain words. */
  instruction: string;
  completeOn: MilestoneMatcher;
  /** Earlier steps that must be complete before this one accepts its milestone. */
  after?: StepId[];
  /** The one guide "Show me" runs, only on the user's tap. */
  showMe?: GuidanceAction;
  /** Written instructions when "Show me" is absent, invalid or off screen. */
  fallback: string;
  /** Wording used when the vault has none of the step's categories. */
  anyEntryCopy?: string;
  /** An existing Cif quick prompt, offered as "Ask Cif". */
  quickPrompt?: string;
}

export interface JourneyDefinition {
  id: JourneyId;
  goal: Goal;
  /** Bumped when steps are added, removed or reordered. */
  version: number;
  title: string;
  steps: StepDefinition[];
  finish: { message: string; next?: GuidanceAction };
}

export type JourneyOutcome = "running" | "exited" | "finished";

/** The persisted record, per vault. Holds step ids only, never vault content. */
export interface JourneyProgress {
  schema: 1;
  journeyId: JourneyId;
  journeyVersion: number;
  startedAt: number;
  completed: StepId[];
  skipped: StepId[];
  /** Set only by Back. Null means "show the first step not done". */
  viewing: StepId | null;
  outcome: JourneyOutcome;
}

/** What the engine needs to know about the vault: its category ids. */
export interface MilestoneContext {
  availableCategories: ReadonlySet<string>;
}

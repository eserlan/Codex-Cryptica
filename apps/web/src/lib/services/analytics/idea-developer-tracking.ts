/**
 * Funnel events for the public Idea Developer (#3228), on top of the Zaraz
 * pipeline (#1796). Every event goes through `trackEvent()`, so it inherits its
 * fail-silent behaviour and attribution merge.
 *
 * Privacy boundary (docs/devops/ZARAZ_ANALYTICS.md): only page identifiers,
 * enumerated values and counts. Each payload is built from named fields, so
 * idea text, turn text, result text and the provider's interaction id cannot
 * reach an event even if a caller passes them. Called only from the public
 * (marketing) tool, never from inside the authenticated app (FR-022).
 */

import { trackEvent } from "./zaraz-analytics";
import type { Arrival } from "$lib/services/idea-developer/arrival";

type Win = any;
const defaultWin = (): Win =>
  typeof window !== "undefined" ? window : undefined;

/** Emits `idea_developer_arrived` when a visitor comes from a "Develop your idea" link. */
export function trackIdeaDeveloperArrived(
  input: Arrival,
  win: Win = defaultWin(),
): void {
  trackEvent(
    "idea_developer_arrived",
    {
      source_kind: input.sourceKind,
      source_id: input.sourceId,
      ...(input.suggestedMode ? { suggested_mode: input.suggestedMode } : {}),
    },
    win,
  );
}

/** Emits `idea_developer_submitted` when the first turn is sent. */
export function trackIdeaDeveloperSubmitted(
  input: { mode: string },
  win: Win = defaultWin(),
): void {
  trackEvent("idea_developer_submitted", { mode: input.mode }, win);
}

/** Emits `idea_developer_turn_submitted` when a later turn is sent. */
export function trackIdeaDeveloperTurnSubmitted(
  input: { turnKind: string; turnIndex: number; mode: string },
  win: Win = defaultWin(),
): void {
  trackEvent(
    "idea_developer_turn_submitted",
    {
      turn_kind: input.turnKind,
      turn_index: input.turnIndex,
      mode: input.mode,
    },
    win,
  );
}

/** Emits `idea_developer_result_shown` when a validated development is displayed. */
export function trackIdeaDeveloperResultShown(
  input: { mode: string; turnIndex: number; suggestionCount: number },
  win: Win = defaultWin(),
): void {
  trackEvent(
    "idea_developer_result_shown",
    {
      mode: input.mode,
      turn_index: input.turnIndex,
      suggestion_count: input.suggestionCount,
    },
    win,
  );
}

/** Emits `idea_developer_generator_opened` when a suggested generator is opened. */
export function trackIdeaDeveloperGeneratorOpened(
  input: { generatorKey: string; position: number },
  win: Win = defaultWin(),
): void {
  trackEvent(
    "idea_developer_generator_opened",
    { generator_key: input.generatorKey, position: input.position },
    win,
  );
}

/** Emits `idea_developer_signup_started` when "Save to your Codex" is chosen. */
export function trackIdeaDeveloperSignupStarted(
  _input: Record<string, never> = {},
  win: Win = defaultWin(),
): void {
  trackEvent("idea_developer_signup_started", { placement: "result" }, win);
}

/** One method per event, for injecting into the store and components. */
export const ideaDeveloperTracker = {
  arrived: trackIdeaDeveloperArrived,
  submitted: trackIdeaDeveloperSubmitted,
  turnSubmitted: trackIdeaDeveloperTurnSubmitted,
  resultShown: trackIdeaDeveloperResultShown,
  generatorOpened: trackIdeaDeveloperGeneratorOpened,
  signupStarted: trackIdeaDeveloperSignupStarted,
};

export type IdeaDeveloperTracker = typeof ideaDeveloperTracker;

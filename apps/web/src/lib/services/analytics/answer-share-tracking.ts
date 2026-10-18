/**
 * Answer-article sharing tracking (#3037) — extends the Zaraz pipeline
 * (#1796) to the lightweight Share action on `/answers/[slug]` pages. Kept
 * separate from discovery-tracking.ts since share intents
 * (clicked -> completed | link_copied) don't fit that module's
 * click/target model.
 *
 * Same privacy boundary as the rest of this pipeline: only the answer slug
 * and its discovery intent id are ever sent, never article content.
 */

import { trackEvent } from "./zaraz-analytics";

export interface AnswerShareEventInput {
  /** Stable answer slug, e.g. "how-do-you-track-faction-turns-between-rpg-sessions". */
  slug: string;
  /** The answer's discovery intent id, when the page has one (discovery.id). */
  intent?: string;
}

function shareProperties(
  input: AnswerShareEventInput,
): Record<string, unknown> {
  return {
    slug: input.slug,
    ...(input.intent ? { intent: input.intent } : {}),
  };
}

/** Emits `answer_share_clicked` when the Share action is activated. */
export function trackAnswerShareClicked(
  input: AnswerShareEventInput,
  win: any = typeof window !== "undefined" ? window : undefined,
): void {
  trackEvent("answer_share_clicked", shareProperties(input), win);
}

/**
 * Emits `answer_share_completed`. Only fire this when the native share
 * sheet's promise actually resolves (the browser confirms the user picked a
 * target app and did not cancel) — never inferred from merely opening the
 * sheet.
 */
export function trackAnswerShareCompleted(
  input: AnswerShareEventInput,
  win: any = typeof window !== "undefined" ? window : undefined,
): void {
  trackEvent("answer_share_completed", shareProperties(input), win);
}

/** Emits `answer_share_link_copied` when the Copy Link fallback succeeds. */
export function trackAnswerShareLinkCopied(
  input: AnswerShareEventInput,
  win: any = typeof window !== "undefined" ? window : undefined,
): void {
  trackEvent("answer_share_link_copied", shareProperties(input), win);
}

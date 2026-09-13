/**
 * "Was this useful?" answer-page feedback tracking (#3038) — extends the
 * Zaraz pipeline (#1796). This is the queryable editorial signal the issue
 * asks for: per the existing pipeline's own guidance (and #3038's own
 * "avoid duplicating the same data into multiple stores"), the vote is
 * captured as a single Zaraz event rather than introducing a new backend
 * aggregation store — the destination analytics tool already aggregates by
 * event property, the same way discovery_click already does.
 *
 * Same privacy boundary as the rest of this pipeline: only the answer slug,
 * its discovery intent id, the yes/no value, and — for a "no" vote — one of
 * a small closed set of structured reasons are ever sent. No free text, no
 * voter identity.
 */

import { trackEvent } from "./zaraz-analytics";

export interface AnswerUsefulVoteInput {
  /** Stable answer slug, e.g. "how-do-you-track-faction-turns-between-rpg-sessions". */
  slug: string;
  /** The answer's discovery intent id, when the page has one (discovery.id). */
  intent?: string;
  value: "yes" | "no";
  /** One of the closed set of structured reasons offered for a "no" vote. */
  reason?: string;
}

/** Emits `answer_useful_vote` when a reader answers "Was this useful?". */
export function trackAnswerUsefulVote(
  input: AnswerUsefulVoteInput,
  win: any = typeof window !== "undefined" ? window : undefined,
): void {
  trackEvent(
    "answer_useful_vote",
    {
      slug: input.slug,
      ...(input.intent ? { intent: input.intent } : {}),
      value: input.value,
      ...(input.reason ? { reason: input.reason } : {}),
    },
    win,
  );
}

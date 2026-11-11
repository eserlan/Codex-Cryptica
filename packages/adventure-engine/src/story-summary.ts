import { MAX_STORY_SO_FAR_CHARS } from "./schemas";
import { error } from "./reducer-result";
import type {
  AdventureSession,
  AdventureValidationError,
  CommittedAdventureTurn,
  Result,
} from "./types";

/** Recent turns sent to the model in full; older ones are only ever seen as notes. */
export const PROMPT_TRANSCRIPT_TURNS = 8;
/** Turns that must have left the window, unsummarised, before a summary is worth a call. */
export const SUMMARY_TRIGGER_TURNS = 8;
/** At most this many turns go into one summary call, oldest first, so a long session catches up in steps. */
export const SUMMARY_CHUNK_TURNS = 16;
const MAX_TURN_TEXT = 1_200;

export interface StorySummaryRequest {
  /** The notes so far, absent before the first summary. */
  previous?: string;
  turns: Array<{ sequence: number; player: string; gm: string }>;
  /** Sequence of the last turn in `turns`; the result is saved against it. */
  throughSequence: number;
}

export interface StorySummaryResult {
  text: string;
  throughSequence: number;
}

/** Turns that have left the transcript window and are not yet in the notes. */
export function unsummarisedTurns(
  session: AdventureSession,
): CommittedAdventureTurn[] {
  const through = session.storySoFar?.throughSequence ?? -1;
  return session.turns
    .slice(0, Math.max(0, session.turns.length - PROMPT_TRANSCRIPT_TURNS))
    .filter((turn) => turn.sequence > through);
}

const clip = (value: string) =>
  value.length <= MAX_TURN_TEXT
    ? value
    : `${value.slice(0, MAX_TURN_TEXT - 1)}…`;

/**
 * The next summary to ask for, or undefined while it is not yet worth a call.
 * Only the player's actions and the GM's narration are included: nothing the
 * player has not seen, so the notes can never leak a secret.
 */
export function buildStorySummaryRequest(
  session: AdventureSession,
): StorySummaryRequest | undefined {
  if (session.status !== "active") return undefined;
  const pending = unsummarisedTurns(session);
  if (pending.length < SUMMARY_TRIGGER_TURNS) return undefined;
  const chunk = pending.slice(0, SUMMARY_CHUNK_TURNS);
  return {
    ...(session.storySoFar ? { previous: session.storySoFar.text } : {}),
    turns: chunk.map((turn) => ({
      sequence: turn.sequence,
      player: clip(turn.playerAction),
      gm: clip(turn.narration),
    })),
    throughSequence: chunk[chunk.length - 1]!.sequence,
  };
}

/**
 * Attach a finished summary to a session without saving it. The notes are
 * persisted by the next turn's own save, so no extra revision is created and the
 * provider conversation is not reset. Rejects a stale, empty or over-long result
 * and leaves the session untouched.
 */
export function attachStorySummary(
  session: AdventureSession,
  result: StorySummaryResult,
  now: string,
): Result<AdventureSession, AdventureValidationError[]> {
  const text = result.text.trim();
  if (session.status !== "active") {
    return error("invalid-transition", "The adventure is not active.");
  }
  if (!text || text.length > MAX_STORY_SO_FAR_CHARS) {
    return error("invalid-schema", "The story notes are empty or too long.");
  }
  const allowed = new Set(unsummarisedTurns(session).map((t) => t.sequence));
  if (!allowed.has(result.throughSequence)) {
    return error("conflicting-patch", "The story notes are out of date.");
  }
  return {
    ok: true,
    value: {
      ...session,
      storySoFar: {
        text,
        throughSequence: result.throughSequence,
        updatedAt: now,
      },
    },
  };
}

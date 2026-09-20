import { fenceSafe } from "./prompt";
import { emphasisFor } from "./modes";
import {
  MAX_CONVERSATION_TURNS,
  type Conversation,
  type Turn,
  type TurnKind,
} from "./types";

/**
 * Turn framing, the turn cap and conversation replay for the Idea Developer
 * (#3228). Pure functions: the web app owns the conversation and the request.
 *
 * Follow-up input is always delimited as data and never joins the system
 * instruction, which the provider holds for the conversation (FR-027).
 */

export type FollowUpKind = Exclude<TurnKind, "idea">;

export interface FollowUpOptions {
  /** The new emphasis, for a mode switch. */
  emphasis?: string;
}

function dataBlock(text: string): string {
  return `<idea>\n${fenceSafe(text)}\n</idea>`;
}

/** The input for a turn after the first. It never repeats the idea or history. */
export function buildFollowUpInput(
  kind: FollowUpKind,
  text: string,
  options: FollowUpOptions = {},
): string {
  switch (kind) {
    case "answer-questions":
      return `The creator answers:\n${dataBlock(text)}`;
    case "change-part":
      return `The creator asks for this change:\n${dataBlock(text)}`;
    case "switch-mode":
      return `Continue with a new emphasis. ${options.emphasis ?? ""}`.trim();
  }
}

export function countDoneTurns(turns: Turn[]): number {
  return turns.filter((turn) => turn.status === "done").length;
}

/** Only completed turns count: a failed or cancelled turn costs nothing. */
export function canContinue(turns: Turn[]): boolean {
  return countDoneTurns(turns) < MAX_CONVERSATION_TURNS;
}

export function remainingTurns(turns: Turn[]): number {
  return Math.max(0, MAX_CONVERSATION_TURNS - countDoneTurns(turns));
}

export interface PendingTurn {
  kind: FollowUpKind;
  text: string;
  emphasis?: string;
}

function describeEarlierTurn(turn: Turn, index: number): string {
  const n = `${index + 1}.`;
  switch (turn.kind) {
    case "answer-questions":
      return `${n} The creator answered:\n${dataBlock(turn.text)}`;
    case "change-part":
      return `${n} The creator asked for this change:\n${dataBlock(turn.text)}`;
    case "switch-mode":
      return `${n} The emphasis changed. ${emphasisFor(turn.mode)}`;
    case "idea":
      return `${n} The idea was submitted.`;
  }
}

/**
 * Rebuilds a conversation the provider no longer holds, as one first-turn
 * input: the original idea, the earlier completed turns in order, the current
 * development, and the turn being attempted now. Sent with the full system
 * instruction and no previous interaction id.
 */
export function buildReplayInput(
  conversation: Conversation,
  pending: PendingTurn,
): string {
  const earlier = conversation.turns.filter(
    (turn) => turn.status === "done" && turn.kind !== "idea",
  );
  const parts = [
    "This conversation is being continued because the earlier turns are no longer available. Here is what happened so far.",
    `The original idea:\n${dataBlock(conversation.ideaText)}`,
  ];
  if (earlier.length > 0) {
    parts.push(
      `Earlier turns, in order:\n${earlier.map(describeEarlierTurn).join("\n")}`,
    );
  }
  if (conversation.latest) {
    parts.push(
      `Your last reply (the current development):\n${JSON.stringify(conversation.latest)}`,
    );
  }
  parts.push(
    `Now continue with this:\n${buildFollowUpInput(pending.kind, pending.text, { emphasis: pending.emphasis })}`,
    'Reply with the full JSON object again, plus a "whatChanged" field: one short line saying what changed.',
  );
  return parts.join("\n\n");
}

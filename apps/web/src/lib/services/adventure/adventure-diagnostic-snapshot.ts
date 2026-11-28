import type {
  AdventureSession,
  HiddenLeakageDiagnostic,
} from "@codex/adventure-engine";
import { integrityChecks } from "./adventure-diagnostic-integrity";
import { diagnosticSummary } from "./adventure-diagnostic-summary";
import { diagnosticTurns } from "./adventure-diagnostic-turns";
import {
  diagnosticState,
  diffDiagnosticState,
  type DiagnosticBaseline,
} from "./adventure-diagnostic-state";

const DIAGNOSTIC_README = [
  "GM-only diagnostic snapshot of one solo adventure, written for an LLM to read.",
  "It contains hidden secrets and GM threads. Do not share with players.",
  "summary: quick orientation. dialogueLoopTurns counts consecutive unanswered related inquiries; dialogueRecoveryDue indicates a dialogue-specific recovery opportunity. investigativeStallTurns counts pursued-thread turns without meaningful advancement; repeatedNonAnswerTurns counts inquiry non-answers; investigativeRecoveryDue indicates pursued-thread stall recovery is due. quietTurns: trailing turns that changed nothing in the world (0 when under 4 turns or a roll is pending). timeToFirstSign: 1-based turn when the first scenario sign/discovery surfaced (null if none). timeToFirstActionableLead: 1-based turn when the first actionable lead was reached (null if none). integrityChecks: precomputed consistency findings (empty arrays mean clean).",
  "state: the current truth. storySoFar is the GM's rolling notes on turns older than the prompt window, written from player-visible text; summary.unsummarisedTurns counts older turns not yet folded in. places lists where the player has been; facts and characters carry a placeId, and ones with none apply everywhere. visibleState is what the player knows; hiddenState and scenarioCollection are GM-only.",
  "source 'provisional' means the Oracle invented it in play; it is not backed by a Vault record.",
  "turns: oldest first. Every turn, condensed or full, carries signals; a missing signal means false or 0: quiet (changed nothing in the world), locationChanged, and stateChanges (visible entries added, updated or removed). summary.longestQuietRun and summary.stalledScenes count quiet streaks, a stalled scene being every fourth quiet turn in a row. A turn's dropped list names the parts of the model's reply the engine left out because they could not apply (an unknown id, a step not allowed yet); the turn itself committed, and summary.droppedParts totals them. Turns marked detail 'condensed' keep only action, narration, time, dropped and signals; detail 'full' also keeps every state patch.",
  "timeAdvance is null when a turn did not move the fictional clock. Time is in minutes.",
  "generation: per-turn GM-only transport, Director-delivery (#5195), and action-fulfilment (#5196) diagnostics, present only on instrumented committed turns; absent means legacy/unknown, never guess it. transport is 'interaction' (retained provider history) or 'stateless' (fresh context, including fallback after a provider failure); a stateless turn is never retained history. threadMode is 'new', 'continued' (provider thread reused) or 'reset'; resetReason names the recorded cause and lastResetReason in the summary is null when no reset was recorded and 'unknown' when a reset had no reason. modelKey is a model registry key only. directorDelivery records whether Director guidance was included, truncated, omitted, or retained-unchanged on the outgoing request; actionResolution records the committed outcome (resolved, roll-required, credible-blocked, clarification, unresolved, unknown) and reducer validation (accepted, corrected, rejected, unknown). Retained conversation is not evidence of action compliance, sent Director advice is not proof of obedience, and proposed outcome is not necessarily the committed outcome. summary.generation rolls up thread reuse/reset counts, directorDelivery, actionOutcome, actionValidation, focused/active scenario IDs and recent #5110 progress categories; summary.droppedParts, pendingRoll, and lastTurnRejection stay the channels for omitted reply parts, pending rolls, and rejected turns.",
  "To capture and interpret a diagnostic for a stalled adventure: copy it while the stall is visible, then compare summary.generation with the quiet and investigative counters. A run of 'stateless' turns after 'interaction' turns points at provider fallback; a reset names why the thread restarted; repeated 'no-observable-change' or 'repeated-non-answer' progress categories alongside quiet turns mean nothing is advancing, while a meaningful recent category with a long quiet run points at a committed change the player never saw. Turns without generation are pre-instrumentation history: treat them as unknown, not as retained success.",
].join(" ");

export interface TurnRejectionDiagnostic {
  reason: string;
  diagnostic?: HiddenLeakageDiagnostic;
  actionResolution?: {
    outcome: "unresolved";
    validation: "rejected";
    evidenceCategory: "rejected-turn";
  };
  revision: number;
  recordedAt: string;
}

export interface AdventureDiagnosticOptions {
  /** Turns that keep their full patches. Older turns are condensed. */
  recentTurns?: number;
  /** Most recent uncommitted turn refusal (if any), for mobile/on-device triage. */
  lastTurnRejection?: TurnRejectionDiagnostic | null;
}

function resolveDiagnosticCutoff(
  session: AdventureSession,
  options: AdventureDiagnosticOptions,
): number {
  const recent = Math.max(0, options.recentTurns ?? 20);
  return Math.max(0, session.turns.length - recent);
}

function diagnosticContext(
  session: AdventureSession,
  cutoff: number,
  options: AdventureDiagnosticOptions,
) {
  return {
    summary: diagnosticSummary(session, cutoff, session.turns.at(-1)),
    ...(options.lastTurnRejection
      ? { lastTurnRejection: options.lastTurnRejection }
      : {}),
    integrityChecks: integrityChecks(session),
  };
}

/**
 * Compact, LLM-oriented JSON snapshot. Keeps the current state in full, the
 * latest turns in full and older turns as action, narration and time only, so
 * long sessions stay within a model's context. The full-fidelity copy remains
 * `adventureReviewJson`.
 */
export function adventureDiagnosticJson(
  session: AdventureSession,
  options: AdventureDiagnosticOptions = {},
): string {
  const cutoff = resolveDiagnosticCutoff(session, options);

  return JSON.stringify(
    {
      _readme: DIAGNOSTIC_README,
      ...diagnosticContext(session, cutoff, options),
      state: diagnosticState(session),
      turns: diagnosticTurns(session, cutoff),
    },
    null,
    1,
  );
}

/**
 * Delta counterpart to `adventureDiagnosticJson`. Emits only turns added and
 * state fields changed since `baseline`, keeping repeated AI-chat pastes small.
 */
export function adventureDiagnosticDeltaJson(
  session: AdventureSession,
  baseline: DiagnosticBaseline,
  options: AdventureDiagnosticOptions = {},
): string {
  const cutoff = resolveDiagnosticCutoff(session, options);
  const fromTurnCount = Math.min(baseline.turnCount, session.turns.length);
  const newTurns = diagnosticTurns(session, fromTurnCount).slice(fromTurnCount);
  const stateChanges = diffDiagnosticState(
    baseline.state,
    diagnosticState(session),
  );

  return JSON.stringify(
    {
      _readme: [
        "GM-only diagnostic DELTA snapshot of one solo adventure, written for an LLM to read.",
        `Covers changes since revision ${baseline.revision} (turn ${fromTurnCount}) up to revision ${session.revision} (turn ${session.turns.length}).`,
        "stateChanges lists only fields added, updated or removed since the previous copy; turns lists only newly committed turns.",
      ].join(" "),
      delta: {
        fromRevision: baseline.revision,
        toRevision: session.revision,
        fromTurnCount,
        toTurnCount: session.turns.length,
        newTurnsCount: newTurns.length,
      },
      ...diagnosticContext(session, cutoff, options),
      stateChanges,
      turns: newTurns,
    },
    null,
    1,
  );
}

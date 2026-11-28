import type {
  AdventureSession,
  HiddenLeakageDiagnostic,
} from "@codex/adventure-engine";
import { integrityChecks } from "./adventure-diagnostic-integrity";
import { diagnosticSummary } from "./adventure-diagnostic-summary";
import { diagnosticTurns } from "./adventure-diagnostic-turns";

export {
  adventureReviewJson,
  adventureReviewMarkdown,
} from "./adventure-review-formats";

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

export interface DiagnosticStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export interface DiagnosticBaseline {
  sessionId: string;
  revision: number;
  turnCount: number;
  state: ReturnType<typeof diagnosticState>;
}

function diagnosticState(session: AdventureSession) {
  return {
    premise: session.premise,
    worldEntry: session.worldEntry,
    playerCharacter: session.playerCharacter,
    visibleState: session.visibleState,
    hiddenState: session.hiddenState,
    scenarioCollection: session.scenarioCollection ?? null,
    worldTime: session.worldTime ?? null,
    places: session.places ?? [],
    currentPlaceId: session.currentPlaceId ?? null,
    storySoFar: session.storySoFar ?? null,
    provisionalFacts: session.provisionalFacts,
    sourceRecords: session.sourceRecords,
    oocExchanges: session.oocExchanges ?? [],
    pendingRoll: session.pendingRoll ?? null,
  };
}

function resolveDiagnosticCutoff(
  session: AdventureSession,
  options: AdventureDiagnosticOptions,
): number {
  const recent = Math.max(0, options.recentTurns ?? 20);
  return Math.max(0, session.turns.length - recent);
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
  const lastTurn = session.turns.at(-1);

  return JSON.stringify(
    {
      _readme: DIAGNOSTIC_README,
      summary: diagnosticSummary(session, cutoff, lastTurn),
      ...(options.lastTurnRejection
        ? { lastTurnRejection: options.lastTurnRejection }
        : {}),
      integrityChecks: integrityChecks(session),
      state: diagnosticState(session),
      turns: diagnosticTurns(session, cutoff),
    },
    null,
    1,
  );
}

const DIAGNOSTIC_BASELINE_PREFIX = "codex-adventure-diagnostic-baseline:";

function baselineKey(sessionId: string): string {
  return DIAGNOSTIC_BASELINE_PREFIX + sessionId;
}

function jsonEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function diffIdArray<T extends { id: string }>(
  prev: readonly T[] | undefined,
  next: readonly T[] | undefined,
): { added: T[]; updated: T[]; removedIds: string[] } | undefined {
  const prevList = prev ?? [];
  const nextList = next ?? [];
  const prevById = new Map(prevList.map((item) => [item.id, item]));
  const nextIds = new Set(nextList.map((item) => item.id));
  const added: T[] = [];
  const updated: T[] = [];
  for (const item of nextList) {
    const before = prevById.get(item.id);
    if (!before) {
      added.push(item);
    } else if (!jsonEqual(before, item)) {
      updated.push(item);
    }
  }
  const removedIds = prevList
    .filter((item) => !nextIds.has(item.id))
    .map((item) => item.id);
  if (added.length === 0 && updated.length === 0 && removedIds.length === 0) {
    return undefined;
  }
  return { added, updated, removedIds };
}

function diffObjectFields(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
  arrayKeys: ReadonlySet<string>,
): Record<string, unknown> | undefined {
  const diff: Record<string, unknown> = {};
  for (const key of Object.keys(next)) {
    if (arrayKeys.has(key)) {
      const arrayDiff = diffIdArray(
        prev[key] as Array<{ id: string }> | undefined,
        next[key] as Array<{ id: string }> | undefined,
      );
      if (arrayDiff) diff[key] = arrayDiff;
    } else if (!jsonEqual(prev[key], next[key])) {
      diff[key] = next[key];
    }
  }
  return Object.keys(diff).length > 0 ? diff : undefined;
}

function diffOptionalObjectField(
  prev: unknown,
  next: unknown,
  idArrayKeys: Set<string>,
): unknown {
  if (jsonEqual(prev, next)) return undefined;
  if (!prev || !next) return next;
  return diffObjectFields(
    prev as Record<string, unknown>,
    next as Record<string, unknown>,
    idArrayKeys,
  );
}

function diffDiagnosticState(
  prev: ReturnType<typeof diagnosticState>,
  next: ReturnType<typeof diagnosticState>,
): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  const topArrayKeys = [
    "places",
    "provisionalFacts",
    "sourceRecords",
    "oocExchanges",
  ] as const;
  for (const key of topArrayKeys) {
    const arrayDiff = diffIdArray(
      prev[key] as Array<{ id: string }>,
      next[key] as Array<{ id: string }>,
    );
    if (arrayDiff) changes[key] = arrayDiff;
  }

  const nestedSpecs: Array<{
    key: "visibleState" | "hiddenState" | "scenarioCollection" | "worldTime";
    idArrayKeys: Set<string>;
  }> = [
    {
      key: "visibleState",
      idArrayKeys: new Set([
        "objectives",
        "activeCharacters",
        "knownFacts",
        "relationships",
      ]),
    },
    {
      key: "hiddenState",
      idArrayKeys: new Set(["secrets", "gmThreads"]),
    },
    {
      key: "scenarioCollection",
      idArrayKeys: new Set(["items"]),
    },
    {
      key: "worldTime",
      idArrayKeys: new Set(["events"]),
    },
  ];
  for (const { key, idArrayKeys } of nestedSpecs) {
    const diff = diffOptionalObjectField(prev[key], next[key], idArrayKeys);
    if (diff !== undefined) changes[key] = diff;
  }

  const scalarKeys = [
    "premise",
    "worldEntry",
    "playerCharacter",
    "currentPlaceId",
    "storySoFar",
    "pendingRoll",
  ] as const;
  for (const key of scalarKeys) {
    if (!jsonEqual(prev[key], next[key])) {
      changes[key] = next[key];
    }
  }
  return changes;
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
  const lastTurn = session.turns.at(-1);
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
      summary: diagnosticSummary(session, cutoff, lastTurn),
      ...(options.lastTurnRejection
        ? { lastTurnRejection: options.lastTurnRejection }
        : {}),
      integrityChecks: integrityChecks(session),
      stateChanges,
      turns: newTurns,
    },
    null,
    1,
  );
}

/** Read a previously saved diagnostic baseline for `sessionId`, if valid. */
export function readDiagnosticBaseline(
  sessionId: string,
  storage: DiagnosticStorage | null | undefined,
): DiagnosticBaseline | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(baselineKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DiagnosticBaseline>;
    if (
      parsed.sessionId !== sessionId ||
      typeof parsed.revision !== "number" ||
      typeof parsed.turnCount !== "number" ||
      !parsed.state
    ) {
      return null;
    }
    return parsed as DiagnosticBaseline;
  } catch {
    return null;
  }
}

/**
 * Copy-ready diagnostic JSON: emits a delta from the last successful copy when
 * a valid baseline exists for the same session (unless `forceFull` is set).
 */
export function copyDiagnosticSnapshot(
  session: AdventureSession,
  storage: DiagnosticStorage | null | undefined,
  options: AdventureDiagnosticOptions & { forceFull?: boolean } = {},
): {
  text: string;
  isDelta: boolean;
  fromTurnCount: number;
  toTurnCount: number;
} {
  const baseline = options.forceFull
    ? null
    : readDiagnosticBaseline(session.id, storage);
  const canDelta =
    baseline !== null &&
    session.turns.length >= baseline.turnCount &&
    session.revision >= baseline.revision;
  const text = canDelta
    ? adventureDiagnosticDeltaJson(session, baseline, options)
    : adventureDiagnosticJson(session, options);

  return {
    text,
    isDelta: canDelta,
    fromTurnCount: canDelta ? baseline.turnCount : 0,
    toTurnCount: session.turns.length,
  };
}

/** Advance the local delta cursor after the diagnostic text was copied. */
export function saveDiagnosticBaseline(
  session: AdventureSession,
  storage: DiagnosticStorage | null | undefined,
): void {
  if (!storage) return;
  try {
    storage.setItem(
      baselineKey(session.id),
      JSON.stringify({
        sessionId: session.id,
        revision: session.revision,
        turnCount: session.turns.length,
        state: structuredClone(diagnosticState(session)),
      }),
    );
  } catch {
    // Ignore storage quota / privacy-mode errors; clipboard copy still succeeds.
  }
}

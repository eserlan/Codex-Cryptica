/**
 * Phase 2 domain operations: recap/inspection, explicit visible-state
 * correction, dice presets, and resource counters. Kept separate from
 * reducer.ts (turn/roll transitions) per the module-per-concern layout
 * established in Phase 1. See specs/2306-adventure-phase-2-play-tools/.
 */
import { applyVisiblePatch } from "./reducer";
import { validateStateBudget } from "./schemas";
import type {
  AdventureRecap,
  AdventureSession,
  AdventureValidationError,
  DicePreset,
  ResourceCounter,
  Result,
  RollHistoryEntry,
  VisibleStatePatch,
} from "./types";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function error(
  code: AdventureValidationError["code"],
  message: string,
): { ok: false; errors: AdventureValidationError[] } {
  return { ok: false, errors: [{ code, message }] };
}

/**
 * Deterministic, client-side render of already-committed visible state and
 * recent transcript. Reads only session.visibleState/turns — there is no
 * parameter through which hiddenState could reach the result.
 */
export function buildAdventureRecap(
  session: AdventureSession,
  recentTurnCount = 3,
): AdventureRecap {
  const recentTurns = session.turns.slice(-recentTurnCount);
  // A roll-required turn (including the opening) never writes a
  // visiblePatch — applyRollRequest only records the pending roll — so
  // visibleState.situation stays empty until the roll resolves. The
  // pending roll's setup narration is already player-visible (it's shown
  // in the roll prompt itself), so it's a safe, non-hidden-state fallback
  // rather than leaving this recap blank while a roll is outstanding.
  const situation =
    session.visibleState.situation ??
    (session.pendingRoll?.setupNarration
      ? {
          id: `pending-roll:${session.pendingRoll.id}`,
          text: session.pendingRoll.setupNarration,
          source: "provisional" as const,
        }
      : undefined);
  return {
    location: session.visibleState.location,
    situation,
    objectives: session.visibleState.objectives,
    activeCharacters: session.visibleState.activeCharacters,
    knownFacts: session.visibleState.knownFacts,
    recentTurnSummaries: recentTurns.map((turn) => turn.narration),
  };
}

/** Turns with a resolvedRoll, in commit order — see data-model.md "Resolved Roll snapshot". */
export function getRollHistory(session: AdventureSession): RollHistoryEntry[] {
  const entries: RollHistoryEntry[] = [];
  for (const turn of session.turns) {
    if (turn.resolvedRoll)
      entries.push({ turn, resolvedRoll: turn.resolvedRoll });
  }
  return entries;
}

/**
 * Apply an explicit, user-initiated correction to player-visible state only.
 * The patch type has no field capable of carrying hiddenState, so a
 * correction cannot touch owner-hidden GM state by construction (FR-009).
 *
 * Callers MUST persist the result through the same optimistic-concurrency
 * `save(expectedRevision, session)` path used for turns, so a correction
 * racing a concurrently-completing turn is rejected rather than silently
 * lost or silently overwriting the other (FR-010) — see
 * contracts/adventure-session-tools.md.
 */
export function applyStateCorrection(
  session: AdventureSession,
  patch: VisibleStatePatch,
  now: string,
): Result<AdventureSession, AdventureValidationError[]> {
  const visible = applyVisiblePatch(session.visibleState, patch);
  if (!visible.ok) {
    return error("conflicting-patch", visible.errors);
  }
  const candidate = clone(session);
  candidate.visibleState = visible.value;
  candidate.revision += 1;
  candidate.updatedAt = now;
  if (!validateStateBudget(candidate)) {
    return error(
      "state-budget-exceeded",
      "The correction would exceed the compact adventure state limit.",
    );
  }
  return { ok: true, value: candidate };
}

export function addDicePreset(
  session: AdventureSession,
  preset: { id: string; label: string; expression: string },
  now: string,
): Result<AdventureSession, AdventureValidationError[]> {
  if (!preset.label.trim() || !preset.expression.trim()) {
    return error(
      "invalid-schema",
      "A dice preset needs both a label and an expression.",
    );
  }
  const candidate = clone(session);
  const entry: DicePreset = { ...preset, createdAt: now };
  candidate.dicePresets = [...candidate.dicePresets, entry];
  candidate.revision += 1;
  candidate.updatedAt = now;
  return { ok: true, value: candidate };
}

export function removeDicePreset(
  session: AdventureSession,
  presetId: string,
  now: string,
): AdventureSession {
  const candidate = clone(session);
  candidate.dicePresets = candidate.dicePresets.filter(
    (preset) => preset.id !== presetId,
  );
  candidate.revision += 1;
  candidate.updatedAt = now;
  return candidate;
}

export function addResourceCounter(
  session: AdventureSession,
  counter: { id: string; label: string; value: number },
  now: string,
): Result<AdventureSession, AdventureValidationError[]> {
  if (!Number.isFinite(counter.value)) {
    return error("invalid-schema", "A resource counter value must be finite.");
  }
  const candidate = clone(session);
  const entry: ResourceCounter = {
    ...counter,
    createdAt: now,
    updatedAt: now,
  };
  candidate.resourceCounters = [...candidate.resourceCounters, entry];
  candidate.revision += 1;
  candidate.updatedAt = now;
  return { ok: true, value: candidate };
}

/**
 * Sets a resource counter's value directly. `newValue` MUST be finite; any
 * finite value (including negative) is accepted, since the engine applies
 * no game-system meaning to it (FR-013).
 */
export function adjustResourceCounter(
  session: AdventureSession,
  counterId: string,
  newValue: number,
  now: string,
): Result<AdventureSession, AdventureValidationError[]> {
  if (!Number.isFinite(newValue)) {
    return error("invalid-schema", "A resource counter value must be finite.");
  }
  if (!session.resourceCounters.some((counter) => counter.id === counterId)) {
    return error("unknown-fact", `Unknown resource counter: ${counterId}`);
  }
  const candidate = clone(session);
  candidate.resourceCounters = candidate.resourceCounters.map((counter) =>
    counter.id === counterId
      ? { ...counter, value: newValue, updatedAt: now }
      : counter,
  );
  candidate.revision += 1;
  candidate.updatedAt = now;
  return { ok: true, value: candidate };
}

export function removeResourceCounter(
  session: AdventureSession,
  counterId: string,
  now: string,
): AdventureSession {
  const candidate = clone(session);
  candidate.resourceCounters = candidate.resourceCounters.filter(
    (counter) => counter.id !== counterId,
  );
  candidate.revision += 1;
  candidate.updatedAt = now;
  return candidate;
}

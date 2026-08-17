import { detectHiddenLeakage } from "./hidden-state";
import {
  MAX_SERIALIZED_STATE_CHARS,
  parseTurnProposal,
  validateStateBudget,
} from "./schemas";
import type {
  AdventureSession,
  AdventureTurnProposal,
  AdventureValidationError,
  CommitMetadata,
  CollectionPatch,
  CommittedAdventureTurn,
  HiddenStatePatch,
  PendingRoll,
  ProvisionalFact,
  Result,
  SuppliedRollOutcome,
  VisibleStatePatch,
} from "./types";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function patchCollection<T extends { id: string }>(
  current: T[],
  patch: CollectionPatch<T>,
): Result<T[], string> {
  const ids = new Set(current.map((entry) => entry.id));
  const addIds = new Set<string>();
  for (const entry of patch.add) {
    if (ids.has(entry.id) || addIds.has(entry.id))
      return { ok: false, errors: `duplicate:${entry.id}` };
    addIds.add(entry.id);
  }
  for (const entry of patch.update) {
    if (!ids.has(entry.id) || patch.removeIds.includes(entry.id)) {
      return { ok: false, errors: `unknown-update:${entry.id}` };
    }
  }
  if (new Set(patch.removeIds).size !== patch.removeIds.length) {
    return { ok: false, errors: "duplicate-removal" };
  }
  const remove = new Set(patch.removeIds);
  return {
    ok: true,
    value: [
      ...current
        .filter((entry) => !remove.has(entry.id))
        .map(
          (entry) =>
            patch.update.find((updated) => updated.id === entry.id) ?? entry,
        ),
      ...patch.add,
    ],
  };
}

function applyVisiblePatch(
  state: AdventureSession["visibleState"],
  patch: VisibleStatePatch,
): Result<AdventureSession["visibleState"], string> {
  const next = clone(state);
  if (patch.location !== undefined) next.location = patch.location ?? undefined;
  if (patch.situation !== undefined)
    next.situation = patch.situation ?? undefined;
  for (const key of [
    "objectives",
    "activeCharacters",
    "knownFacts",
    "relationships",
  ] as const) {
    const result = patchCollection(next[key], patch[key]);
    if (!result.ok) return result;
    next[key] = result.value as never;
  }
  return { ok: true, value: next };
}

function applyHiddenPatch(
  state: AdventureSession["hiddenState"],
  patch: HiddenStatePatch,
): Result<AdventureSession["hiddenState"], string> {
  const next = clone(state);
  for (const key of ["secrets", "gmThreads"] as const) {
    const result = patchCollection(next[key], patch[key]);
    if (!result.ok) return result;
    next[key] = result.value as never;
  }
  return { ok: true, value: next };
}

function error(code: AdventureValidationError["code"], message: string) {
  return { ok: false as const, errors: [{ code, message }] };
}

export function applyCompletedTurn(
  session: AdventureSession,
  proposalInput: AdventureTurnProposal,
  meta: CommitMetadata,
  now = meta.now,
): Result<AdventureSession, AdventureValidationError[]> {
  if (session.status !== "active" || session.pendingRoll) {
    return error(
      "invalid-transition",
      "The session is not ready for a completed turn.",
    );
  }
  if (
    meta.inputId.length === 0 ||
    session.turns.some((turn) => turn.inputId === meta.inputId)
  ) {
    return error("duplicate-input", "This action was already processed.");
  }
  const proposal = parseTurnProposal(proposalInput);
  if (proposal.kind !== "complete") {
    return error(
      "invalid-schema",
      "A completed turn requires a complete proposal.",
    );
  }
  if (detectHiddenLeakage(session, proposal).length > 0) {
    return error(
      "hidden-leakage",
      "The response contains unrevealed GM information.",
    );
  }
  const visible = applyVisiblePatch(
    session.visibleState,
    proposal.visiblePatch,
  );
  if (!visible.ok) return error("conflicting-patch", visible.errors);
  const hidden = applyHiddenPatch(session.hiddenState, proposal.hiddenPatch);
  if (!hidden.ok) return error("conflicting-patch", hidden.errors);
  const revealed = new Set(proposal.revealSecretIds);
  for (const secretId of revealed) {
    const secret = hidden.value.secrets.find((entry) => entry.id === secretId);
    if (!secret) return error("unknown-secret", `Unknown secret: ${secretId}`);
    secret.status = "revealed";
    secret.revealedOnTurnId = meta.turnId;
  }
  const provisionalFacts: ProvisionalFact[] = proposal.provisionalFacts.map(
    (fact) => ({
      ...fact,
      introducedOnTurnId: meta.turnId,
    }),
  );
  const candidate = clone(session);
  candidate.visibleState = visible.value;
  candidate.hiddenState = hidden.value;
  candidate.provisionalFacts = [
    ...candidate.provisionalFacts,
    ...provisionalFacts,
  ];
  const turn: CommittedAdventureTurn = {
    id: meta.turnId,
    sequence: session.turns.length,
    inputId: meta.inputId,
    playerAction: meta.playerAction ?? "",
    narration: proposal.narration,
    visiblePatch: proposal.visiblePatch,
    hiddenPatch: proposal.hiddenPatch,
    revealedSecretIds: proposal.revealSecretIds,
    sourceRecordIds: proposal.sourceRecordIds,
    provisionalFactIds: provisionalFacts.map((fact) => fact.id),
    committedAt: now,
    suggestedActions: proposal.suggestedActions,
  };
  candidate.turns = [...candidate.turns, turn];
  candidate.revision += 1;
  candidate.updatedAt = now;
  candidate.lastPlayedAt = now;
  if (!validateStateBudget(candidate)) {
    return error(
      "state-budget-exceeded",
      `The compact adventure state exceeds ${MAX_SERIALIZED_STATE_CHARS} characters.`,
    );
  }
  return { ok: true, value: candidate };
}

export function applyRollRequest(
  session: AdventureSession,
  proposalInput: AdventureTurnProposal,
  meta: CommitMetadata,
): Result<AdventureSession, AdventureValidationError[]> {
  if (session.status !== "active" || session.pendingRoll) {
    return error(
      "invalid-transition",
      "The session already has a pending change.",
    );
  }
  const proposal = parseTurnProposal(proposalInput);
  if (proposal.kind !== "roll-required")
    return error("invalid-schema", "A roll is required.");
  const candidate = clone(session);
  const pending: PendingRoll = {
    id: meta.turnId,
    inputId: meta.inputId,
    playerAction: meta.playerAction ?? "",
    setupNarration: proposal.setupNarration,
    uncertainty: proposal.uncertainty,
    stakes: proposal.stakes,
    dice: proposal.dice
      ? {
          expression: proposal.dice.expression,
          bands: proposal.dice.outcomeBands,
        }
      : undefined,
    resolutionStatus: "awaiting-outcome",
    createdAt: meta.now,
    suggestedActions: proposal.suggestedActions,
  };
  candidate.pendingRoll = pending;
  candidate.revision += 1;
  candidate.updatedAt = meta.now;
  return { ok: true, value: candidate };
}

export function recordPendingRollOutcome(
  session: AdventureSession,
  inputId: string,
  outcome: SuppliedRollOutcome,
  meta: CommitMetadata,
): Result<AdventureSession, AdventureValidationError[]> {
  if (!session.pendingRoll || session.pendingRoll.inputId !== inputId) {
    return error("invalid-roll", "No matching pending roll exists.");
  }
  if (session.pendingRoll.suppliedOutcome) {
    return error(
      "invalid-roll",
      "A result has already been recorded for this roll.",
    );
  }
  const candidate = clone(session);
  candidate.pendingRoll = {
    ...candidate.pendingRoll!,
    suppliedOutcome: outcome,
    resolutionStatus: "ready-to-resolve",
    outcomeRecordedAt: meta.now,
  };
  candidate.revision += 1;
  candidate.updatedAt = meta.now;
  return { ok: true, value: candidate };
}

export function dismissPendingRoll(
  session: AdventureSession,
  inputId: string,
  meta: CommitMetadata,
): Result<AdventureSession, AdventureValidationError[]> {
  if (!session.pendingRoll || session.pendingRoll.inputId !== inputId) {
    return error("invalid-roll", "No matching pending roll exists.");
  }
  if (session.pendingRoll.suppliedOutcome) {
    return error("invalid-roll", "A recorded result cannot be dismissed.");
  }
  const candidate = clone(session);
  candidate.pendingRoll = null;
  candidate.revision += 1;
  candidate.updatedAt = meta.now;
  return { ok: true, value: candidate };
}

export function resolveRecordedRoll(
  session: AdventureSession,
  proposalInput: AdventureTurnProposal,
  meta: CommitMetadata,
): Result<AdventureSession, AdventureValidationError[]> {
  if (!session.pendingRoll?.suppliedOutcome) {
    return error("invalid-roll", "No recorded result is ready for resolution.");
  }
  const pendingRoll = session.pendingRoll;
  const result = applyCompletedTurn(
    { ...session, pendingRoll: null },
    proposalInput,
    meta,
  );
  if (!result.ok) return result;
  const candidate = result.value;
  candidate.pendingRoll = null;
  candidate.turns[candidate.turns.length - 1]!.rollOutcome =
    pendingRoll.suppliedOutcome;
  return { ok: true, value: candidate };
}

export function createPlayerTranscript(session: AdventureSession) {
  return {
    sessionId: session.id,
    title: session.title,
    turns: session.turns.map((turn) => ({
      sequence: turn.sequence,
      playerAction: turn.playerAction,
      narration: turn.narration,
      committedAt: turn.committedAt,
    })),
  };
}

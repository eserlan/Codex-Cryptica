import {
  ACTIVE_INSPECTION_RE,
  isInvestigativeInquiry,
  isTurnNonAnswer,
  isUnansweredInquiryTurn,
  type TurnProgressClassification,
} from "./turn-progression";
import type {
  ActionEvidenceCategory,
  ActionResolutionOutcome,
  ActionResolutionTrace,
  CommittedAdventureTurn,
} from "./types";

const CREDIBLE_BLOCK_RE =
  /\b(?:locked|barred|blocked|bolted\s+(?:shut|closed|from|against)|sealed|jammed|impassable|cannot\s+(?:enter|open|pass|reach|cross)|can't\s+(?:enter|open|pass|reach|cross)|refuses?\s+to\s+(?:let|allow|admit|grant)|turns?\s+you\s+away|won't\s+let\s+you|barred\s+from|no\s+way\s+(?:in|through|past|across))\b/i;

const MOVEMENT_ACTION_RE =
  /^(?:i\s+)?(?:go|walk|head|move|enter|step|cross|climb|leave|return|travel|follow|proceed|push\s+through|open\s+(?:the\s+)?door)\b/i;

const CLARIFICATION_QUESTION_RE =
  /\b(?:which\s+(?:one|way|door|path|person|record|entry)|what\s+do\s+you\s+mean|do\s+you\s+mean|could\s+you\s+clarify|before\s+we\s+proceed|specify\s+which|clarify\s+whether)\b/i;

function classifyDroppedKind(reason: string): string {
  const lower = reason.toLowerCase();
  if (lower.startsWith("timeadvance:")) return "time-advance";
  if (lower.startsWith("packagesceneid:")) return "package-scene";
  if (lower.startsWith("packageevents:")) return "package-event";
  if (lower.startsWith("actorevents:")) return "actor-event";
  if (lower.startsWith("reveal:")) return "scenario-reveal";
  if (lower.includes("elaborat")) return "scenario-elaboration";
  return "state-patch";
}

function summarizeDropped(dropped: string[] | undefined): {
  droppedCount?: number;
  droppedKinds?: string[];
} {
  if (!dropped?.length) return {};
  const kinds = [...new Set(dropped.map(classifyDroppedKind))];
  return {
    droppedCount: dropped.length,
    droppedKinds: kinds.slice(0, 16),
  };
}

function hasCollectionDelta(section: {
  add: unknown[];
  update: unknown[];
  removeIds: unknown[];
}): boolean {
  return (
    section.add.length > 0 ||
    section.update.length > 0 ||
    section.removeIds.length > 0
  );
}

function hasVisibleStateDelta(turn: CommittedAdventureTurn): boolean {
  const patch = turn.visiblePatch;
  const hasPatchFields =
    patch.location !== undefined || patch.situation !== undefined;
  const hasCollections = [
    patch.knownFacts,
    patch.activeCharacters,
    patch.objectives,
    patch.relationships,
  ].some(hasCollectionDelta);
  const hasTurnRefs =
    turn.provisionalFactIds.length > 0 || turn.revealedSecretIds.length > 0;
  return (
    hasPatchFields || hasCollections || hasTurnRefs || turn.timeAdvance != null
  );
}

function hasProgressDelta(progress: TurnProgressClassification): boolean {
  return (
    progress.kind === "scenario-stage-or-status-change" ||
    progress.kind === "actionable-discovery" ||
    progress.kind === "obstacle-advanced-or-resolved" ||
    progress.kind === "causal-state-change" ||
    progress.kind === "consequential-player-choice" ||
    progress.kind === "useful-negative-finding"
  );
}

function isClarificationTurn(turn: CommittedAdventureTurn): boolean {
  const trimmed = turn.narration.trim();
  return trimmed.endsWith("?") && CLARIFICATION_QUESTION_RE.test(trimmed);
}

function isCredibleBlockTurn(
  turn: CommittedAdventureTurn,
  progress: TurnProgressClassification,
): boolean {
  if (progress.kind === "obstacle-advanced-or-resolved") return false;
  const moved = turn.visiblePatch.location !== undefined;
  if (moved || !CREDIBLE_BLOCK_RE.test(turn.narration)) return false;
  return (
    MOVEMENT_ACTION_RE.test(turn.playerAction.trim()) ||
    !hasVisibleStateDelta(turn)
  );
}

function isWitnessWithLimits(turn: CommittedAdventureTurn): boolean {
  return (
    isInvestigativeInquiry(turn.playerAction) &&
    isTurnNonAnswer(turn.narration) &&
    !isUnansweredInquiryTurn(turn)
  );
}

function isDiscoveryProgress(
  turn: CommittedAdventureTurn,
  progress: TurnProgressClassification,
): boolean {
  return (
    progress.kind === "actionable-discovery" ||
    progress.kind === "scenario-stage-or-status-change" ||
    progress.kind === "useful-negative-finding" ||
    turn.revealedSecretIds.length > 0
  );
}

function isStatePatchProgress(
  hasVisibleDelta: boolean,
  progress: TurnProgressClassification,
): boolean {
  return (
    hasVisibleDelta ||
    progress.kind === "causal-state-change" ||
    progress.kind === "consequential-player-choice" ||
    progress.kind === "obstacle-advanced-or-resolved"
  );
}

function resolveOutcomeAndEvidence(
  turn: CommittedAdventureTurn,
  progress: TurnProgressClassification,
  packageSceneMoved: boolean,
): {
  outcome: ActionResolutionOutcome;
  evidenceCategory: ActionEvidenceCategory;
} {
  const hasVisibleDelta =
    hasVisibleStateDelta(turn) ||
    hasProgressDelta(progress) ||
    packageSceneMoved;
  const moved = turn.visiblePatch.location !== undefined || packageSceneMoved;

  const rules: Array<
    [boolean, ActionResolutionOutcome, ActionEvidenceCategory]
  > = [
    [
      progress.nonAnswer || progress.kind === "repeated-non-answer",
      "unresolved",
      "non-answer",
    ],
    [turn.resolvedRoll != null, "resolved", "roll-resolved"],
    [
      Boolean(turn.dropped?.length) && !hasVisibleDelta,
      "unresolved",
      "dropped-patch",
    ],
    [isWitnessWithLimits(turn), "resolved", "witness-limit"],
    [moved, "resolved", "movement"],
    [isCredibleBlockTurn(turn, progress), "credible-blocked", "credible-block"],
    [isDiscoveryProgress(turn, progress), "resolved", "discovery"],
    [
      !hasVisibleDelta && isClarificationTurn(turn),
      "clarification",
      "clarification",
    ],
    [
      isStatePatchProgress(hasVisibleDelta, progress),
      "resolved",
      "state-patch",
    ],
    [ACTIVE_INSPECTION_RE.test(turn.playerAction), "resolved", "observation"],
    [progress.kind === "no-observable-change", "resolved", "quiet-play"],
  ];

  const match = rules.find(([condition]) => condition);
  return match
    ? { outcome: match[1], evidenceCategory: match[2] }
    : { outcome: "unknown", evidenceCategory: "none" };
}

/**
 * Deterministic classification of action fulfilment and reducer validation on a
 * committed turn (#5196). Reuses #5110/#5175 progression and non-answer signals.
 */
export function classifyActionResolution(
  turn: CommittedAdventureTurn,
  progress: TurnProgressClassification,
  options: { packageSceneMoved?: boolean } = {},
): ActionResolutionTrace {
  const validation = turn.dropped?.length ? "corrected" : "accepted";
  const { outcome, evidenceCategory } = resolveOutcomeAndEvidence(
    turn,
    progress,
    options.packageSceneMoved ?? false,
  );
  return {
    outcome,
    validation,
    evidenceCategory,
    ...summarizeDropped(turn.dropped),
    ...(turn.resolvedRoll != null ? { resolvedRoll: true } : {}),
  };
}

import { isDeliberateRepeat, threadTopicWords } from "./dialogue-pacing";
import { scenarioEventTurnIds } from "./scenario-collection";
import { isQuietTurn } from "./scene-pacing";
import {
  buildPriorProgressionStateIndex,
  type PriorProgressionState,
} from "./turn-progression-scope";
import {
  buildPursuedThreadScope,
  classifyTurnProgress,
  hasOtherScenarioScopedActivity,
  isDisengagementAction,
  isInvestigativeInquiry,
  isPlayerVisibleScenarioEvent,
  isTurnNonAnswer,
  matchesPursuedTokens,
  type PursuedThreadScope,
  type TurnProgressClassification,
  type TurnProgressKind,
} from "./turn-progression";
import type {
  AdventureSession,
  CommittedAdventureTurn,
  ScenarioItem,
} from "./types";

/** Consecutive engaging turns without meaningful advancement before recovery. */
export const INVESTIGATIVE_STALL_TURN_LIMIT = 4;

/** Non-answers across witnesses/phrasings before investigative recovery triggers. */
export const MULTI_WITNESS_NON_ANSWER_LIMIT = 3;

/** Bounded lookback over committed turns for prompt-time progression scoring. */
export const MAX_PROGRESSION_LOOKBACK_TURNS = 128;

export type InvestigativeRecoveryAngle =
  | "alternate-route"
  | "observable-consequence"
  | "re-evaluate"
  | "trail-exhausted";

export interface InvestigativePacing {
  active: boolean;
  turnsWithoutAdvancement: number;
  repeatedNonAnswerTurns: number;
  lastTurnKind?: TurnProgressKind;
  stalled: boolean;
  recoveryDue: boolean;
  recommendedAngle?: InvestigativeRecoveryAngle;
}

export interface InvestigativePacingContext {
  pursuedScenario?: ScenarioItem;
  hasActivePackageScene?: boolean;
}

const LEGITIMATE_SILENCE_RE =
  /\b(?:stay\s+quiet|say\s+nothing|sit\s+quietly|keep\s+quiet|remain\s+silent|hold\s+(?:my|your|one's)?\s*tongue|listen\s+quietly|watch\s+in\s+silence)\b/i;

const WAITING_ONLY_RE =
  /^(?:i\s+)?(?:wait|rest|sleep|pass\s+the\s+time|linger|bide\s+(?:my|your)\s+time|camp|stay\s+until)\b/i;

const EXPLICIT_INVESTIGATIVE_INTENT_RE =
  /\b(?:investigat\w*|clue|clues|lead|leads|rumour|rumours|rumor|rumors|mystery|suspect\w*|witness\w*|search\w*|inspect\w*|examin\w*|follow\s+up|look\s+into|check\s+(?:out|around|for|the)|what\s+happened|who\s+is\s+behind|missing|vanish\w*|disappear\w*|trail|tracks|evidence|probe|audit|verify)\b/i;

function isWaitingOnlyAction(action: string): boolean {
  return (
    WAITING_ONLY_RE.test(action.trim()) &&
    !EXPLICIT_INVESTIGATIVE_INTENT_RE.test(action)
  );
}

function isBareWaitTurn(
  turn: CommittedAdventureTurn,
  scenarioTurnIds: ReadonlySet<string>,
): boolean {
  if (!isQuietTurn(turn, scenarioTurnIds)) return false;
  if (isWaitingOnlyAction(turn.playerAction)) return true;
  return (
    turn.timeAdvance !== undefined &&
    !isTurnNonAnswer(turn.narration) &&
    !isInvestigativeInquiry(turn.playerAction)
  );
}

function otherOpenHeardScenarios(
  session: AdventureSession,
  pursuedId: string,
): ScenarioItem[] {
  return (session.scenarioCollection?.items ?? []).filter(
    (item) =>
      item.id !== pursuedId &&
      item.knowledge === "heard" &&
      item.status === "open",
  );
}

function matchesOtherHeardScenario(
  action: string,
  session: AdventureSession,
  pursuedId: string,
): boolean {
  const actionTokens = threadTopicWords(action);
  if (actionTokens.size === 0) return false;
  return otherOpenHeardScenarios(session, pursuedId).some((item) => {
    const scope = buildPursuedThreadScope(item, session);
    return [...actionTokens].some((token) => scope.distinctTokens.has(token));
  });
}

function findScenarioByAction(
  items: readonly ScenarioItem[],
  session: AdventureSession,
  action: string | undefined,
): ScenarioItem | undefined {
  if (!action) return undefined;
  return items.find((item) =>
    matchesPursuedTokens(action, buildPursuedThreadScope(item, session)),
  );
}

function findScenarioByRecentTurns(
  items: readonly ScenarioItem[],
  session: AdventureSession,
): ScenarioItem | undefined {
  for (const turn of session.turns.slice(-6).reverse()) {
    const match = items.find(
      (item) =>
        item.events.some(
          (e) => e.turnId === turn.id && isPlayerVisibleScenarioEvent(item, e),
        ) ||
        matchesPursuedTokens(
          turn.playerAction,
          buildPursuedThreadScope(item, session),
        ),
    );
    if (match) return match;
  }
  return undefined;
}

function resolvePursuedScenario(
  session: AdventureSession,
  nextAction: string | undefined,
  context?: InvestigativePacingContext,
): ScenarioItem | undefined {
  if (context && "pursuedScenario" in context) {
    return context.pursuedScenario;
  }
  const items = (session.scenarioCollection?.items ?? []).filter(
    (item) => item.status === "open" && item.knowledge === "heard",
  );
  if (items.length === 0) return undefined;

  const byAction = findScenarioByAction(items, session, nextAction);
  if (byAction) return byAction;

  const focusedId = session.scenarioCollection?.focusedScenarioId;
  const focused = items.find((item) => item.id === focusedId);
  return focused ?? findScenarioByRecentTurns(items, session);
}

function turnLinksToPursuedScenario(
  turn: CommittedAdventureTurn,
  session: AdventureSession,
  pursuedScenario: ScenarioItem,
  scope: PursuedThreadScope,
): boolean {
  if (matchesPursuedTokens(turn.playerAction, scope)) return true;
  const factIds = new Set(turn.provisionalFactIds);
  const hasScopedFact = session.provisionalFacts.some(
    (fact) =>
      fact.visibility === "player-visible" &&
      (factIds.has(fact.id) || fact.introducedOnTurnId === turn.id) &&
      fact.scenarioId === scope.scenarioId,
  );
  if (
    hasScopedFact ||
    pursuedScenario.events.some(
      (e) =>
        e.turnId === turn.id &&
        isPlayerVisibleScenarioEvent(pursuedScenario, e),
    )
  ) {
    return true;
  }
  if (matchesOtherHeardScenario(turn.playerAction, session, scope.scenarioId)) {
    return false;
  }
  return (
    pursuedScenario.id === session.scenarioCollection?.focusedScenarioId &&
    EXPLICIT_INVESTIGATIVE_INTENT_RE.test(turn.playerAction)
  );
}

function turnEngagesThread(
  turn: CommittedAdventureTurn,
  session: AdventureSession,
  pursuedScenario: ScenarioItem | undefined,
  scope: PursuedThreadScope | undefined,
  classification: TurnProgressClassification,
): boolean {
  if (scope && pursuedScenario) {
    const blockedByOther =
      hasOtherScenarioScopedActivity(turn, session, scope) &&
      !matchesPursuedTokens(turn.playerAction, scope);
    return blockedByOther
      ? false
      : turnLinksToPursuedScenario(turn, session, pursuedScenario, scope);
  }
  if (
    isInvestigativeInquiry(turn.playerAction) &&
    (classification.kind === "repeated-non-answer" || classification.nonAnswer)
  ) {
    return true;
  }
  return EXPLICIT_INVESTIGATIVE_INTENT_RE.test(turn.playerAction);
}

function nextActionLinksToScenario(
  nextAction: string,
  session: AdventureSession,
  pursuedScenario: ScenarioItem,
  scope: PursuedThreadScope,
): boolean {
  if (matchesPursuedTokens(nextAction, scope)) return true;
  if (matchesOtherHeardScenario(nextAction, session, scope.scenarioId)) {
    return false;
  }
  return (
    pursuedScenario.id === session.scenarioCollection?.focusedScenarioId &&
    EXPLICIT_INVESTIGATIVE_INTENT_RE.test(nextAction)
  );
}

function nextActionContinuesThread(
  nextAction: string | undefined,
  session: AdventureSession,
  pursuedScenario: ScenarioItem | undefined,
  scope: PursuedThreadScope | undefined,
  threadTopic: ReadonlySet<string>,
): boolean {
  if (nextAction === undefined) return true;
  if (scope && pursuedScenario) {
    return nextActionLinksToScenario(
      nextAction,
      session,
      pursuedScenario,
      scope,
    );
  }
  const actionTopics = threadTopicWords(nextAction);
  if (threadTopic.size > 0)
    return [...threadTopic].some((word) => actionTopics.has(word));
  if (EXPLICIT_INVESTIGATIVE_INTENT_RE.test(nextAction)) return true;
  return false;
}

function selectRecommendedAngle(
  turnsWithoutAdvancement: number,
  repeatedNonAnswerTurns: number,
  lastTurnKind: TurnProgressKind | undefined,
  pursuedScenario: ScenarioItem | undefined,
): InvestigativeRecoveryAngle {
  if (
    repeatedNonAnswerTurns >= MULTI_WITNESS_NON_ANSWER_LIMIT &&
    turnsWithoutAdvancement >= INVESTIGATIVE_STALL_TURN_LIMIT * 2
  ) {
    return "trail-exhausted";
  }
  if (repeatedNonAnswerTurns >= MULTI_WITNESS_NON_ANSWER_LIMIT) {
    return "alternate-route";
  }
  if (lastTurnKind === "no-observable-change") return "observable-consequence";
  if (
    pursuedScenario &&
    (pursuedScenario.stage === "actionable-clue" ||
      pursuedScenario.stage === "revelation-crisis")
  ) {
    return "re-evaluate";
  }
  return "alternate-route";
}

function isSuppressedNextAction(nextAction: string | undefined): boolean {
  if (!nextAction) return false;
  return (
    isDeliberateRepeat(nextAction) ||
    isDisengagementAction(nextAction) ||
    LEGITIMATE_SILENCE_RE.test(nextAction) ||
    isWaitingOnlyAction(nextAction)
  );
}

function isDisengagingCurrentThread(
  action: string,
  session: AdventureSession,
  scope: PursuedThreadScope | undefined,
): boolean {
  if (!isDisengagementAction(action)) return false;
  return (
    !scope || !matchesOtherHeardScenario(action, session, scope.scenarioId)
  );
}

function isNonAdvancingThreadTurn(
  turn: CommittedAdventureTurn,
  session: AdventureSession,
  pursuedScenario: ScenarioItem | undefined,
  scope: PursuedThreadScope | undefined,
  scenarioTurnIds: ReadonlySet<string>,
  priorState: PriorProgressionState | undefined,
): { stop: boolean; classification?: TurnProgressClassification } {
  if (isDisengagingCurrentThread(turn.playerAction, session, scope)) {
    return { stop: true };
  }
  const classification = classifyTurnProgress(turn, session, {
    pursuedScenario,
    priorState,
    scenarioTurnIds,
  });
  const advances = pursuedScenario
    ? classification.advancesPursuedThread
    : classification.meaningful;
  return { stop: advances, classification };
}

function extendSharedThreadTopic(
  existingTopic: ReadonlySet<string>,
  action: string,
): Set<string> | undefined {
  const topic = threadTopicWords(action);
  if (topic.size === 0) return undefined;
  if (existingTopic.size === 0) return topic;
  const shared = new Set([...existingTopic].filter((word) => topic.has(word)));
  return shared.size > 0 ? shared : undefined;
}

function isNonAnswerInquiry(
  turn: CommittedAdventureTurn,
  classification: TurnProgressClassification,
): boolean {
  return (
    isInvestigativeInquiry(turn.playerAction) &&
    (classification.kind === "repeated-non-answer" || classification.nonAnswer)
  );
}

interface MutableStallCounts {
  turnsWithoutAdvancement: number;
  repeatedNonAnswerTurns: number;
  lastTurnKind: TurnProgressKind | undefined;
  threadTopic: Set<string>;
}

function processTrailingTurn(
  turn: CommittedAdventureTurn,
  session: AdventureSession,
  pursuedScenario: ScenarioItem | undefined,
  scope: PursuedThreadScope | undefined,
  scenarioTurnIds: ReadonlySet<string>,
  priorState: PriorProgressionState | undefined,
  counts: MutableStallCounts,
): boolean {
  if (isBareWaitTurn(turn, scenarioTurnIds)) return false;
  const { stop, classification } = isNonAdvancingThreadTurn(
    turn,
    session,
    pursuedScenario,
    scope,
    scenarioTurnIds,
    priorState,
  );
  if (stop) return true;
  if (
    !classification ||
    !turnEngagesThread(turn, session, pursuedScenario, scope, classification)
  ) {
    return false;
  }
  if (!scope) {
    const sharedTopic = extendSharedThreadTopic(
      counts.threadTopic,
      turn.playerAction,
    );
    if (!sharedTopic) return true;
    counts.threadTopic = sharedTopic;
  }
  counts.turnsWithoutAdvancement += 1;
  if (isNonAnswerInquiry(turn, classification)) {
    counts.repeatedNonAnswerTurns += 1;
  }
  counts.lastTurnKind ??= classification.kind;
  return false;
}

function scanTrailingStall(
  session: AdventureSession,
  pursuedScenario: ScenarioItem | undefined,
  scope: PursuedThreadScope | undefined,
  scenarioTurnIds: ReadonlySet<string>,
) {
  const lookbackStart = Math.max(
    0,
    session.turns.length - MAX_PROGRESSION_LOOKBACK_TURNS,
  );
  const counts: MutableStallCounts = {
    turnsWithoutAdvancement: 0,
    repeatedNonAnswerTurns: 0,
    lastTurnKind: undefined,
    threadTopic: new Set(),
  };
  const priorStates = buildPriorProgressionStateIndex(
    session,
    new Set(session.turns.slice(lookbackStart).map((turn) => turn.id)),
  );

  for (let i = session.turns.length - 1; i >= lookbackStart; i -= 1) {
    const turn = session.turns[i]!;
    if (
      processTrailingTurn(
        turn,
        session,
        pursuedScenario,
        scope,
        scenarioTurnIds,
        priorStates.get(turn.id),
        counts,
      )
    )
      break;
  }

  return {
    turnsWithoutAdvancement: counts.turnsWithoutAdvancement,
    repeatedNonAnswerTurns: counts.repeatedNonAnswerTurns,
    lastTurnKind: counts.lastTurnKind,
    threadTopic: counts.threadTopic,
  };
}

function shouldSkipUnscopedFallback(
  context: InvestigativePacingContext | undefined,
  pursuedScenario: ScenarioItem | undefined,
  hasActivePackageScene: boolean,
  session: AdventureSession,
): boolean {
  if (!context || !("pursuedScenario" in context)) return false;
  if (pursuedScenario || hasActivePackageScene) return false;
  return (session.scenarioCollection?.items ?? []).some(
    (item) => item.status === "open" && item.knowledge === "heard",
  );
}

function isInvestigativeActive(
  session: AdventureSession,
  pursuedScenario: ScenarioItem | undefined,
  hasActivePackageScene: boolean,
  nextAction: string | undefined,
  counts: {
    turnsWithoutAdvancement: number;
    repeatedNonAnswerTurns: number;
    threadTopic: ReadonlySet<string>;
  },
): boolean {
  if (
    pursuedScenario ||
    hasActivePackageScene ||
    session.visibleState.situation
  ) {
    return true;
  }
  return isUnscopedInvestigativeActive(nextAction, counts);
}

function isUnscopedInvestigativeActive(
  nextAction: string | undefined,
  counts: {
    turnsWithoutAdvancement: number;
    repeatedNonAnswerTurns: number;
    threadTopic: ReadonlySet<string>;
  },
): boolean {
  if (nextAction && counts.threadTopic.size > 0) {
    const actionTopics = threadTopicWords(nextAction);
    if (![...counts.threadTopic].some((word) => actionTopics.has(word))) {
      return false;
    }
  }
  if (counts.repeatedNonAnswerTurns >= MULTI_WITNESS_NON_ANSWER_LIMIT) {
    return true;
  }
  return Boolean(
    nextAction &&
    EXPLICIT_INVESTIGATIVE_INTENT_RE.test(nextAction) &&
    counts.turnsWithoutAdvancement > 0,
  );
}

/**
 * Deterministic pursued-thread investigative churn tracker.
 * Independent from `sceneStallPacing` (#5080) and `dialogueLoopPacing` (#5083).
 */
export function investigativeProgressPacing(
  session: AdventureSession,
  nextAction?: string,
  context?: InvestigativePacingContext,
): InvestigativePacing | undefined {
  if (session.pendingRoll || isSuppressedNextAction(nextAction)) {
    return undefined;
  }

  const pursuedScenario = resolvePursuedScenario(session, nextAction, context);
  const hasActivePackageScene =
    context?.hasActivePackageScene ??
    Boolean(session.sourcePackage || session.packageProgress);
  if (
    shouldSkipUnscopedFallback(
      context,
      pursuedScenario,
      hasActivePackageScene,
      session,
    )
  ) {
    return undefined;
  }

  const scope = pursuedScenario
    ? buildPursuedThreadScope(pursuedScenario, session)
    : undefined;
  const counts = scanTrailingStall(
    session,
    pursuedScenario,
    scope,
    scenarioEventTurnIds(session),
  );
  if (
    !isInvestigativeActive(
      session,
      pursuedScenario,
      hasActivePackageScene,
      nextAction,
      counts,
    )
  ) {
    return undefined;
  }

  const stalled =
    counts.turnsWithoutAdvancement >= INVESTIGATIVE_STALL_TURN_LIMIT ||
    counts.repeatedNonAnswerTurns >= MULTI_WITNESS_NON_ANSWER_LIMIT;
  const recoveryDue =
    stalled &&
    nextActionContinuesThread(
      nextAction,
      session,
      pursuedScenario,
      scope,
      counts.threadTopic,
    );

  return {
    active: true,
    turnsWithoutAdvancement: counts.turnsWithoutAdvancement,
    repeatedNonAnswerTurns: counts.repeatedNonAnswerTurns,
    ...(counts.lastTurnKind ? { lastTurnKind: counts.lastTurnKind } : {}),
    stalled,
    recoveryDue,
    ...(stalled
      ? {
          recommendedAngle: selectRecommendedAngle(
            counts.turnsWithoutAdvancement,
            counts.repeatedNonAnswerTurns,
            counts.lastTurnKind,
            pursuedScenario,
          ),
        }
      : {}),
  };
}

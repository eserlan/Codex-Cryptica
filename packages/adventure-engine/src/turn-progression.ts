import {
  isDeliberateRepeat,
  isInquiry,
  isNonAnswer,
  threadTopicWords,
} from "./dialogue-pacing";
import { scenarioEventTurnIds } from "./scenario-collection";
import { isQuietTurn } from "./scene-pacing";
import {
  buildPursuedThreadScope,
  hasOtherScenarioScopedActivity,
  isPlayerVisibleScenarioEvent,
  matchesPursuedTokens,
  normalizeText,
  resolvePriorProgressionState,
  turnProvisionalFacts,
  type PriorProgressionState,
  type PursuedThreadScope,
} from "./turn-progression-scope";
import type {
  AdventureSession,
  CommittedAdventureTurn,
  PackageProgressEvent,
  ProvisionalFact,
  ScenarioEvent,
  ScenarioItem,
} from "./types";

export {
  buildPursuedThreadScope,
  hasOtherScenarioScopedActivity,
  isPlayerVisibleScenarioEvent,
  matchesPursuedTokens,
  resolvePriorProgressionState,
  type PriorProgressionState,
  type PursuedThreadScope,
};

export type TurnProgressKind =
  | "scenario-stage-or-status-change"
  | "actionable-discovery"
  | "obstacle-advanced-or-resolved"
  | "causal-state-change"
  | "consequential-player-choice"
  | "useful-negative-finding"
  | "repeated-non-answer"
  | "ordinary-interaction"
  | "no-observable-change";

export interface TurnProgressClassification {
  kind: TurnProgressKind;
  meaningful: boolean;
  advancesPursuedThread: boolean;
  nonAnswer: boolean;
}

export interface ClassifyTurnProgressOptions {
  pursuedScenario?: ScenarioItem;
  priorTurns?: readonly CommittedAdventureTurn[];
  priorFacts?: readonly ProvisionalFact[];
  priorState?: PriorProgressionState;
  scenarioTurnIds?: ReadonlySet<string>;
}

const DISENGAGEMENT_ACTION_RE =
  /\b(?:decline(?:\s+to\s+investigate)?|ignore\s+(?:it|this|that|the\s+(?:lead|rumour|rumor|matter|sign|bell))|abandon|stop\s+investigating|never\s+mind|head\s+home|walk\s+away)\b/i;

const COMMITMENT_ACTION_RE =
  /\b(?:swear\s+to|pledge\s+to|commit\s+to|accept\s+the\s+(?:commission|job|offer|task|risk)|take\s+responsibility)\b/i;

const INVESTIGATIVE_INQUIRY_PREFIX_RE =
  /^(?:i\s+)?(?:ask|question|inquire|enquire|interview|interrogate|press|probe|talk\s+to|speak\s+(?:to|with)|check\s+with)\b/i;

export const ACTIVE_INSPECTION_RE =
  /\b(?:search|inspect|examine|check|investigate|look\s+(?:at|in|inside|under|around|behind|for)|open|probe|test|verify|audit|read|count|weigh|measure|scan|sweep|excavate|dig|trace)\b/i;

const EXTRA_NON_ANSWER_RE =
  /\b(?:never heard|know(?:s)? nothing|nothing to (?:say|tell|add|report)|no (?:clue|knowledge|memory|word)|refuse(?:s)? to (?:say|answer|tell|speak)|stay(?:s)? silent|remains? silent)\b/i;

const WITNESS_DEFLECTION_RE =
  /\b(?:(?:don.t|do not|doesn.t|does not|didn.t|did not)\s+know|can.t\s+(?:say|tell|name)|cannot\s+(?:say|tell|name)|couldn.t\s+(?:say|tell)|no\s+(?:idea|record|clue|knowledge|memory|way\s+to)|not\s+(?:sure|certain)|unable\s+to\s+(?:say|tell|name)|won.t\s+guess|never\s+heard|know(?:s)?\s+nothing|nothing\s+to\s+(?:say|tell|add|report)|refuse(?:s)?\s+to\s+(?:say|answer|tell|speak))\b/i;

const WITNESS_DENIAL_FACT_RE =
  /\b(?:denies?|denied|claims?\s+not\s+to|says?\s+(?:he|she|they)\s+(?:don't|do not|didn't|did not|can't|cannot|never)|no\s+idea|not\s+sure|couldn't\s+say|cannot\s+name|won't\s+guess|refuses?\s+to|knows?\s+nothing|never\s+heard|never\s+saw|unaware|unnamed)\b/i;

const ACCOUNTING_LINE_RE =
  /\b(?:owes?|owed|owing|debt|debts|ledger|tally|tallies|entry|entries|account|accounts|balance|balances|sum|sums|paid|unpaid|loan|loans|credit|creditor|creditors|copper|silver|gold|coin|coins|shilling|shillings|pence|farthing|bushel|bushels|sack|sacks|tax|taxes|fee|fees|dues|wage|wages|receipt|manifest|note)\b/i;

const TAMPERING_OR_CONCEALMENT_RE =
  /\b(?:forged|falsified|altered|tampered|torn|missing\s+page|burned|burnt|hidden|concealed|buried|tucked|wedged|stashed|pried|forced|bloodstained|coded|cipher|sealed\s+(?:letter|note))\b/i;

const PHYSICAL_EVIDENCE_RE =
  /\b(?:footprint|footprints|bootprint|bootprints|track|tracks|blood|bloodstain|bloodstains|stain|stains|scratch|scratches|scrape|scrapes|splinter|splinters|shaving|shavings|chalk|ash|soot|wax|seal|sigil|symbol|key|lockpick|crowbar|knife|dagger|blade|rope|cord|cloth|rag|thread|button|ring|locket|letter|parchment|map|keycard|datapad|vial|powder|residue|mud|oil|lamp|lantern|casing|shell|fragment|shard|broken|tampered|forced|pried|burned|burnt|hidden|concealed|buried|tucked|wedged|stashed|forged|falsified|torn|missing\s+page|unlocked|pick(?:ed)?\s+lock|secret\s+door|trapdoor|bloodstained)\b/i;

const NEGATIVE_FINDING_RE =
  /\b(?:empty|nothing|none|no\s+(?:sign|trace|mark|marks|entry|entries|record|records|evidence|clue|clues|body|tracks|blood|key|ledger|gold|grain)|absent|missing|unbroken|untouched|undisturbed|clean|clear|ruled\s+out|not\s+(?:there|present|inside|found|stolen|broken|forged)|free\s+of|void\s+of|bare)\b/i;

const NEGATIVE_GENERIC_TOKENS = new Set(
  "empty nothing none absent missing unbroken untouched undisturbed clean clear found contains holds still remains there present inside".split(
    " ",
  ),
);

export function isDisengagementAction(action: string): boolean {
  return DISENGAGEMENT_ACTION_RE.test(action);
}

const SPEAKER_FRAMING_RE =
  /^(?:the\s+)?[\w'-]+(?:\s+[\w'-]+){0,3}\s+(?:says?|mutters?|replies?|replied|answers?|answered|sighs?|shrugs?|frowns?|hesitates?|nods?|shakes?\s+(?:his|her|their)\s+head|flips?\s+a\s+page|glances?\s+(?:away|aside|down|up)|stares?|pauses?)\b/i;

const REDIRECT_ONLY_RE =
  /^(?:you\s+(?:should|can|could|might)\s+)?(?:ask|check|try|go|speak|talk|look)\s+(?:at|with|to|in|elsewhere|around|the)\b/i;

const ANSWER_DELIVERY_RE =
  /\b(?:names?|named|identifies?|identified|confirms?|confirmed|explains?|explained|reveals?|revealed|offers?|offered|hands?|handed|reports?|reported|admits?|admitted)\b/i;

const AFFIRMATIVE_STOP_WORDS = new Set(
  "a an the and or but though although yet however so if in on at to of for from by with as is are was were be been being he she they it we you i his her their its my your our this that these those there here".split(
    " ",
  ),
);

function stripSurroundingQuotes(text: string): string {
  return text.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();
}

function contentWordCount(text: string): number {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !AFFIRMATIVE_STOP_WORDS.has(w));
  return words.length;
}

function extractQuotedSegments(narration: string): Set<string> {
  const quoted = new Set<string>();
  const re = /["“]([^"”]+)["”]/g;
  for (const match of narration.matchAll(re)) {
    if (match[1]) quoted.add(match[1]);
  }
  return quoted;
}

function isExcludedClause(cleaned: string): boolean {
  return (
    !cleaned ||
    isTurnNonAnswer(cleaned) ||
    WITNESS_DEFLECTION_RE.test(cleaned) ||
    NEGATIVE_FINDING_RE.test(cleaned) ||
    SPEAKER_FRAMING_RE.test(cleaned) ||
    REDIRECT_ONLY_RE.test(cleaned)
  );
}

function isSubstantiveAffirmativeClause(
  rawClause: string,
  inQuotes: boolean,
  actionTopic: ReadonlySet<string>,
): boolean {
  const cleaned = stripSurroundingQuotes(rawClause);
  if (isExcludedClause(cleaned) || contentWordCount(cleaned) < 2) {
    return false;
  }
  if (inQuotes || ANSWER_DELIVERY_RE.test(cleaned)) return true;
  return [...threadTopicWords(cleaned)].some((word) => actionTopic.has(word));
}

const SUMMON_REQUEST_RE =
  /\b(?:bring|summon|fetch|call\s+(?:for|in)|send\s+for)\b/i;

function hasFulfilledInquiryPatch(
  turn: CommittedAdventureTurn,
  actionTopic: ReadonlySet<string>,
): boolean {
  if (actionTopic.size === 0 || !SUMMON_REQUEST_RE.test(turn.playerAction)) {
    return false;
  }
  return turn.visiblePatch.activeCharacters.add.some((entry) => {
    for (const word of threadTopicWords(entry.text)) {
      if (actionTopic.has(word)) return true;
    }
    return false;
  });
}

function hasResponsiveAnswerWithQualification(
  turn: CommittedAdventureTurn,
): boolean {
  const actionTopic = threadTopicWords(turn.playerAction);
  if (hasFulfilledInquiryPatch(turn, actionTopic)) return true;

  const quotedSegments = extractQuotedSegments(turn.narration);
  const clauses = turn.narration
    .split(/[.!?;:\n]+|,?\s+\b(?:but|though|although|yet|however)\b\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const clause of clauses) {
    const cleaned = stripSurroundingQuotes(clause);
    const inQuotes =
      /^["“]/.test(clause) ||
      /["”]$/.test(clause) ||
      [...quotedSegments].some((q) => cleaned && q.includes(cleaned));
    if (isSubstantiveAffirmativeClause(clause, inQuotes, actionTopic)) {
      return true;
    }
  }
  return false;
}

export function isTurnNonAnswer(narration: string): boolean {
  return isNonAnswer(narration) || EXTRA_NON_ANSWER_RE.test(narration);
}

/**
 * Returns true when an investigative inquiry turn's narration is genuinely
 * unanswered, rather than a responsive answer paired with an epistemic limit.
 */
export function isUnansweredInquiryTurn(turn: CommittedAdventureTurn): boolean {
  if (!isTurnNonAnswer(turn.narration)) return false;
  return !hasResponsiveAnswerWithQualification(turn);
}

export function isInvestigativeInquiry(action: string): boolean {
  if (isDeliberateRepeat(action)) return false;
  return (
    isInquiry(action) || INVESTIGATIVE_INQUIRY_PREFIX_RE.test(action.trim())
  );
}

function isConcretePhysicalEvidence(
  factText: string,
  turnNarration: string,
  priorNormalizedFacts: Pick<ReadonlySet<string>, "has">,
): boolean {
  const normalized = normalizeText(factText);
  if (!normalized || priorNormalizedFacts.has(normalized)) return false;
  if (WITNESS_DEFLECTION_RE.test(turnNarration)) return false;
  if (WITNESS_DENIAL_FACT_RE.test(factText)) return false;
  if (
    ACCOUNTING_LINE_RE.test(factText) &&
    !TAMPERING_OR_CONCEALMENT_RE.test(factText)
  ) {
    return false;
  }
  return PHYSICAL_EVIDENCE_RE.test(factText);
}

function sharesNegativeTarget(candidate: string, priorFact: string): boolean {
  if (normalizeText(candidate) === normalizeText(priorFact)) return true;
  const extract = (s: string) =>
    new Set(
      [...threadTopicWords(s)].filter((t) => !NEGATIVE_GENERIC_TOKENS.has(t)),
    );
  const candTokens = extract(candidate);
  const priorTokens = extract(priorFact);
  if (candTokens.size === 0 || priorTokens.size === 0) return false;
  let overlap = 0;
  for (const token of candTokens) if (priorTokens.has(token)) overlap += 1;
  return overlap >= Math.max(1, Math.ceil(candTokens.size * 0.5));
}

interface TurnContext {
  turn: CommittedAdventureTurn;
  session: AdventureSession;
  scope?: PursuedThreadScope;
  prior: PriorProgressionState;
  scenarioEvents: Array<{ scenario: ScenarioItem; event: ScenarioEvent }>;
  pkgEvents: PackageProgressEvent[];
  introducedFacts: ProvisionalFact[];
  otherScoped: boolean;
  actionMatchesScope: boolean;
}

interface CategoryMatch {
  kind: TurnProgressKind;
  advancesPursuedThread: boolean;
}

function matchStageOrStatus(ctx: TurnContext): CategoryMatch | null {
  const stageEvents = ctx.scenarioEvents.filter(
    ({ event }) =>
      event.kind === "stage-change" || event.kind === "status-change",
  );
  const pkgStage = ctx.pkgEvents.some(
    (e) => e.to === "resolved" || e.to === "altered",
  );
  if (stageEvents.length === 0 && !pkgStage) return null;
  const advances = ctx.scope
    ? stageEvents.some(
        ({ scenario }) => scenario.id === ctx.scope!.scenarioId,
      ) ||
      (pkgStage && !ctx.otherScoped && ctx.actionMatchesScope)
    : true;
  return {
    kind: "scenario-stage-or-status-change",
    advancesPursuedThread: advances,
  };
}

function factAdvancesScope(fact: ProvisionalFact, ctx: TurnContext): boolean {
  if (!ctx.scope) return true;
  if (fact.scenarioId === ctx.scope.scenarioId) return true;
  if (fact.scenarioId !== undefined || ctx.otherScoped) return false;
  return (
    matchesPursuedTokens(`${fact.name} ${fact.summary}`, ctx.scope) ||
    ctx.actionMatchesScope
  );
}

function discoveryAdvancesScope(
  ctx: TurnContext,
  discoveries: Array<{ scenario: ScenarioItem; event: ScenarioEvent }>,
  pkgClue: boolean,
  clueFacts: ProvisionalFact[],
  concreteFacts: CommittedAdventureTurn["visiblePatch"]["knownFacts"]["add"],
): boolean {
  const { scope, turn, otherScoped, actionMatchesScope } = ctx;
  if (!scope) return true;
  return (
    turn.revealedSecretIds.some((id) => scope.boundSecretIds.has(id)) ||
    discoveries.some(({ scenario }) => scenario.id === scope.scenarioId) ||
    (pkgClue && !otherScoped && actionMatchesScope) ||
    clueFacts.some((f) => factAdvancesScope(f, ctx)) ||
    concreteFacts.some(
      (f) =>
        !otherScoped &&
        (matchesPursuedTokens(f.text, scope) || actionMatchesScope),
    )
  );
}

function matchActionableDiscovery(ctx: TurnContext): CategoryMatch | null {
  const { turn, prior, scenarioEvents, pkgEvents, introducedFacts } = ctx;
  const discoveries = scenarioEvents.filter(
    ({ scenario, event }) =>
      event.kind === "discovery" &&
      isPlayerVisibleScenarioEvent(scenario, event),
  );
  const pkgClue = pkgEvents.some(
    (e) =>
      (e.kind === "clue" || e.kind === "secret") &&
      ["available", "active", "resolved", "altered"].includes(e.to),
  );
  const clueFacts = introducedFacts.filter(
    (f) =>
      f.visibility === "player-visible" &&
      (f.kind === "clue" || f.kind === "item"),
  );
  const concreteFacts = turn.visiblePatch.knownFacts.add.filter((fact) => {
    const norm = normalizeText(fact.text);
    if (!norm || prior.priorNormalizedFacts.has(norm)) return false;
    return (
      fact.source === "revealed-secret" ||
      isConcretePhysicalEvidence(
        fact.text,
        turn.narration,
        prior.priorNormalizedFacts,
      )
    );
  });

  const hasSignal =
    turn.revealedSecretIds.length > 0 ||
    discoveries.length > 0 ||
    pkgClue ||
    clueFacts.length > 0 ||
    concreteFacts.length > 0;
  if (!hasSignal) return null;

  return {
    kind: "actionable-discovery",
    advancesPursuedThread: discoveryAdvancesScope(
      ctx,
      discoveries,
      pkgClue,
      clueFacts,
      concreteFacts,
    ),
  };
}

function matchObstacle(ctx: TurnContext): CategoryMatch | null {
  const { turn, scope, pkgEvents, otherScoped, actionMatchesScope } = ctx;
  const hasRoll = Boolean(turn.resolvedRoll || turn.rollOutcome);
  const pkgEncounter = pkgEvents.some((e) => e.kind === "encounter");
  const removedObj = turn.visiblePatch.objectives.removeIds.length > 0;
  if (!hasRoll && !pkgEncounter && !removedObj) return null;

  const advances = scope
    ? !otherScoped &&
      (actionMatchesScope || matchesPursuedTokens(turn.narration, scope))
    : true;
  return {
    kind: "obstacle-advanced-or-resolved",
    advancesPursuedThread: advances,
  };
}

function hasDistinctSituation(ctx: TurnContext): boolean {
  const sit = ctx.turn.visiblePatch.situation;
  if (sit === undefined) return false;
  if (sit === null) {
    return (
      Boolean(ctx.prior.priorSituation) &&
      !isDisengagementAction(ctx.turn.playerAction)
    );
  }
  const text = normalizeText(sit.text);
  return text.length > 0 && text !== ctx.prior.priorSituation;
}

function hasMaterialRelationshipChange(ctx: TurnContext): boolean {
  return [
    ...ctx.turn.visiblePatch.relationships.add,
    ...ctx.turn.visiblePatch.relationships.update,
  ].some((rel) => {
    const next = normalizeText(rel.disposition);
    if (!next) return false;
    const prev = ctx.prior.priorDispositions.get(rel.subjectId);
    return prev === undefined || prev !== next;
  });
}

function hasGmThreadReveal(turn: CommittedAdventureTurn): boolean {
  return (
    turn.hiddenPatch.gmThreads.removeIds.length > 0 ||
    turn.hiddenPatch.gmThreads.update.some((t) => t.status === "revealed") ||
    turn.hiddenPatch.gmThreads.add.some((t) => t.status === "revealed")
  );
}

function hasPkgActorChange(session: AdventureSession, turnId: string): boolean {
  return (session.packageProgress?.actorEvents ?? []).some(
    (e) =>
      e.turnId === turnId &&
      e.certainty === "confirmed" &&
      (e.status !== undefined || e.disposition !== undefined),
  );
}

function situationAdvancesScope(
  ctx: TurnContext,
  sitChanged: boolean,
): boolean {
  if (!sitChanged || !ctx.scope) return false;
  const sit = ctx.turn.visiblePatch.situation;
  return sit
    ? matchesPursuedTokens(sit.text, ctx.scope) || ctx.actionMatchesScope
    : ctx.actionMatchesScope;
}

function causalAdvancesScope(
  ctx: TurnContext,
  consequences: Array<{ scenario: ScenarioItem; event: ScenarioEvent }>,
  worldTimeEvents: NonNullable<AdventureSession["worldTime"]>["events"],
  sitChanged: boolean,
  unscopedCausal: boolean,
): boolean {
  const { scope, otherScoped, actionMatchesScope } = ctx;
  if (!scope) return true;
  if (consequences.some(({ scenario }) => scenario.id === scope.scenarioId)) {
    return true;
  }
  if (worldTimeEvents.some((e) => e.threadId === scope.scenarioId)) return true;
  if (otherScoped) return false;
  return (
    situationAdvancesScope(ctx, sitChanged) ||
    (unscopedCausal && actionMatchesScope)
  );
}

function matchCausalStateChange(ctx: TurnContext): CategoryMatch | null {
  const { turn, session, scenarioEvents } = ctx;
  const consequences = scenarioEvents.filter(
    ({ scenario, event }) =>
      event.kind === "consequence" &&
      isPlayerVisibleScenarioEvent(scenario, event),
  );
  const sitChanged = hasDistinctSituation(ctx);
  const unscopedCausal =
    hasMaterialRelationshipChange(ctx) ||
    hasPkgActorChange(session, turn.id) ||
    hasGmThreadReveal(turn);
  const worldTimeEvents = (session.worldTime?.events ?? []).filter(
    (e) => e.turnId === turn.id,
  );

  const anyCausal =
    consequences.length > 0 ||
    sitChanged ||
    unscopedCausal ||
    worldTimeEvents.length > 0;
  if (!anyCausal) return null;

  return {
    kind: "causal-state-change",
    advancesPursuedThread: causalAdvancesScope(
      ctx,
      consequences,
      worldTimeEvents,
      sitChanged,
      unscopedCausal,
    ),
  };
}

function isNewLocationTravel(ctx: TurnContext): boolean {
  const loc = ctx.turn.visiblePatch.location;
  if (!loc) return false;
  const normalized = normalizeText(loc.text);
  if (!normalized || ctx.prior.priorVisitedLocations.has(normalized)) {
    return false;
  }
  const travelDeflection =
    isInvestigativeInquiry(ctx.turn.playerAction) &&
    isUnansweredInquiryTurn(ctx.turn);
  return (
    (!WITNESS_DEFLECTION_RE.test(ctx.turn.narration) ||
      hasResponsiveAnswerWithQualification(ctx.turn)) &&
    !travelDeflection
  );
}

function locationOrObjMatchesScope(
  ctx: TurnContext,
  objList: CommittedAdventureTurn["visiblePatch"]["objectives"]["add"],
  newLocation: boolean,
): boolean {
  const scope = ctx.scope!;
  if (
    newLocation &&
    (matchesPursuedTokens(ctx.turn.visiblePatch.location!.text, scope) ||
      ctx.actionMatchesScope)
  ) {
    return true;
  }
  if (objList.length === 0) return false;
  return (
    objList.some((o) => matchesPursuedTokens(o.text, scope)) ||
    ctx.actionMatchesScope
  );
}

function choiceAdvancesScope(
  ctx: TurnContext,
  objList: CommittedAdventureTurn["visiblePatch"]["objectives"]["add"],
  disengagedOrCommitted: boolean,
  newLocation: boolean,
): boolean {
  if (!ctx.scope) return true;
  if (ctx.otherScoped) return false;
  return (
    locationOrObjMatchesScope(ctx, objList, newLocation) ||
    (disengagedOrCommitted && ctx.actionMatchesScope)
  );
}

function matchPlayerChoice(ctx: TurnContext): CategoryMatch | null {
  const { turn } = ctx;
  const objList = [
    ...turn.visiblePatch.objectives.add,
    ...turn.visiblePatch.objectives.update,
  ];
  const disengagedOrCommitted =
    isDisengagementAction(turn.playerAction) ||
    COMMITMENT_ACTION_RE.test(turn.playerAction);
  const newLocation = isNewLocationTravel(ctx);
  if (objList.length === 0 && !disengagedOrCommitted && !newLocation)
    return null;

  return {
    kind: "consequential-player-choice",
    advancesPursuedThread: choiceAdvancesScope(
      ctx,
      objList,
      disengagedOrCommitted,
      newLocation,
    ),
  };
}

function matchUsefulNegativeFinding(ctx: TurnContext): CategoryMatch | null {
  const { turn, scope, prior, otherScoped, actionMatchesScope } = ctx;
  const isInspection =
    ACTIVE_INSPECTION_RE.test(turn.playerAction) &&
    !INVESTIGATIVE_INQUIRY_PREFIX_RE.test(turn.playerAction.trim());
  if (!isInspection || WITNESS_DEFLECTION_RE.test(turn.narration)) return null;

  const negatives = turn.visiblePatch.knownFacts.add
    .map((f) => f.text)
    .filter(
      (text) =>
        NEGATIVE_FINDING_RE.test(text) && !WITNESS_DENIAL_FACT_RE.test(text),
    );
  const hasNovel = negatives.some((candidate) => {
    for (const previous of prior.priorKnownFacts) {
      if (
        NEGATIVE_FINDING_RE.test(previous) &&
        sharesNegativeTarget(candidate, previous)
      ) {
        return false;
      }
    }
    return true;
  });
  if (!hasNovel) return null;

  const advances = scope
    ? !otherScoped &&
      (negatives.some((t) => matchesPursuedTokens(t, scope)) ||
        actionMatchesScope)
    : true;
  return { kind: "useful-negative-finding", advancesPursuedThread: advances };
}

function collectTurnScenarioEvents(
  session: AdventureSession,
  turnId: string,
): Array<{ scenario: ScenarioItem; event: ScenarioEvent }> {
  const out: Array<{ scenario: ScenarioItem; event: ScenarioEvent }> = [];
  for (const scenario of session.scenarioCollection?.items ?? []) {
    for (const event of scenario.events) {
      if (event.turnId === turnId) out.push({ scenario, event });
    }
  }
  return out;
}

function resolveTurnPriorState(
  turn: CommittedAdventureTurn,
  session: AdventureSession,
  options: ClassifyTurnProgressOptions | undefined,
): PriorProgressionState {
  if (options?.priorState) return options.priorState;
  return resolvePriorProgressionState(
    turn,
    session,
    options?.priorTurns,
    options?.priorFacts,
  );
}

function buildTurnContext(
  turn: CommittedAdventureTurn,
  session: AdventureSession,
  options?: ClassifyTurnProgressOptions,
): TurnContext {
  const scope = options?.pursuedScenario
    ? buildPursuedThreadScope(options.pursuedScenario, session)
    : undefined;
  return {
    turn,
    session,
    scope,
    prior: resolveTurnPriorState(turn, session, options),
    scenarioEvents: collectTurnScenarioEvents(session, turn.id),
    pkgEvents: (session.packageProgress?.events ?? []).filter(
      (e) => e.turnId === turn.id && e.certainty === "confirmed",
    ),
    introducedFacts: turnProvisionalFacts(turn, session),
    otherScoped: scope
      ? hasOtherScenarioScopedActivity(turn, session, scope)
      : false,
    actionMatchesScope: scope
      ? matchesPursuedTokens(turn.playerAction, scope)
      : true,
  };
}

/**
 * Deterministic 9-category classification of a single committed turn from
 * committed state, scenario/package events, rolls, worldTime, action, and narration.
 */
export function classifyTurnProgress(
  turn: CommittedAdventureTurn,
  session: AdventureSession,
  options?: ClassifyTurnProgressOptions,
): TurnProgressClassification {
  const ctx = buildTurnContext(turn, session, options);
  const matches = [
    matchStageOrStatus(ctx),
    matchActionableDiscovery(ctx),
    matchObstacle(ctx),
    matchCausalStateChange(ctx),
    matchPlayerChoice(ctx),
    matchUsefulNegativeFinding(ctx),
  ].filter((item): item is CategoryMatch => item !== null);

  const nonAnswerNarration = isUnansweredInquiryTurn(turn);
  const inquiryNonAnswer =
    !isDeliberateRepeat(turn.playerAction) &&
    isInvestigativeInquiry(turn.playerAction) &&
    nonAnswerNarration;

  if (matches.length > 0) {
    const advancesPursuedThread = matches.some((m) => m.advancesPursuedThread);
    return {
      kind: matches[0]!.kind,
      meaningful: true,
      advancesPursuedThread,
      nonAnswer: !advancesPursuedThread && inquiryNonAnswer,
    };
  }
  if (inquiryNonAnswer) {
    return {
      kind: "repeated-non-answer",
      meaningful: false,
      advancesPursuedThread: false,
      nonAnswer: true,
    };
  }
  const quiet = isQuietTurn(
    turn,
    options?.scenarioTurnIds ?? scenarioEventTurnIds(session),
  );
  return {
    kind: quiet ? "no-observable-change" : "ordinary-interaction",
    meaningful: false,
    advancesPursuedThread: false,
    nonAnswer: false,
  };
}

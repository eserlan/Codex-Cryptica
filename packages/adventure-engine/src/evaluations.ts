import { detectHiddenLeakage, detectHiddenTextLeakage } from "./hidden-state";
import type {
  AdventureRecap,
  AdventureSession,
  AdventureTurnProposal,
  PlayerTranscript,
  ScenarioElaborationStage,
  ScenarioItem,
} from "./types";

export interface EvaluationTurn {
  narration: string;
  playerCharacterName?: string;
  proposal: AdventureTurnProposal;
  playerAction?: string;
  previousSession?: AdventureSession;
  session?: AdventureSession;
  canaries?: string[];
  gmOnlyLore?: string[];
  errorMessages?: string[];
  recap?: AdventureRecap;
  transcript?: PlayerTranscript;
}

export type RubricDimension =
  | "agency"
  | "secrecy"
  | "continuity"
  | "canonSafety"
  | "consequenceCredibility"
  | "unnecessaryEscalation";

export interface RubricScores {
  agency: number;
  secrecy: number;
  continuity: number;
  canonSafety: number;
  consequenceCredibility: number;
  unnecessaryEscalation: number;
}

export interface TurnEvaluationResult {
  scores: RubricScores;
  passed: boolean;
  failures: RubricDimension[];
}

export interface RunEvaluationResult {
  scores: RubricScores;
  passed: boolean;
  failures: RubricDimension[];
  turns: TurnEvaluationResult[];
}

const STAGE_ORDER: Record<ScenarioElaborationStage, number> = {
  hearsay: 0,
  "actionable-clue": 1,
  "revelation-crisis": 2,
};

const FORCED_ACTION_PATTERN =
  /\b(you must|you have to|you are forced to|you decide to|you choose to|your only choice is)\b/i;

const DECLINED_OR_ORDINARY_ACTION_PATTERN =
  /\b(decline|refuse|ignore|walk away|stay|rest|sleep|eat|cook|buy|browse|chat|ordinary|mundane|end the adventure|go home|head home|skip|pass on)\b/i;

const FORCED_ESCALATION_PATTERN =
  /\b(ambush|attack(?:s|ed)? you|roll for initiative|sudden combat|boss|crisis erupts|forced to fight|must stop|mandatory quest)\b/i;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(value: string): string {
  return value.toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

function uniqueIds(items: ReadonlyArray<{ id: string }>): boolean {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
  }
  return true;
}

function playerVisibleProposalPayload(
  proposal: AdventureTurnProposal,
): unknown {
  if (proposal.kind === "complete") {
    const { hiddenPatch: _hidden, timeAdvance, ...visible } = proposal;
    return {
      ...visible,
      ...(timeAdvance
        ? {
            timeAdvance: {
              minutes: timeAdvance.minutes,
              cause: timeAdvance.cause,
            },
          }
        : {}),
    };
  }
  return proposal;
}

function collectPlayerFacingTexts(turn: EvaluationTurn): string[] {
  const texts: string[] = [
    turn.narration,
    JSON.stringify(playerVisibleProposalPayload(turn.proposal)),
  ];
  if (turn.proposal.kind === "roll-required" && turn.proposal.setupNarration) {
    texts.push(turn.proposal.setupNarration);
  }
  if (turn.recap) texts.push(JSON.stringify(turn.recap));
  if (turn.transcript) texts.push(JSON.stringify(turn.transcript));
  if (turn.errorMessages) texts.push(...turn.errorMessages);
  return texts;
}

function collectScenarioSecretSources(
  turn: EvaluationTurn,
  sourceSession: AdventureSession,
  secrets: string[],
): void {
  const revealedSecrets = new Set(
    turn.proposal.kind === "complete" ? turn.proposal.revealSecretIds : [],
  );
  const revealedScenarios = new Set(
    turn.proposal.kind === "complete"
      ? (turn.proposal.revealScenarioIds ?? [])
      : [],
  );
  for (const item of sourceSession.scenarioCollection?.items ?? []) {
    collectScenarioItemSecrets(
      item,
      revealedSecrets,
      revealedScenarios,
      secrets,
    );
  }
}

function collectScenarioItemSecrets(
  item: ScenarioItem,
  proposalRevealedSecrets: Set<string>,
  proposalRevealedScenarios: Set<string>,
  secrets: string[],
): void {
  const revealed = new Set([
    ...item.revealedSecretIds,
    ...proposalRevealedSecrets,
  ]);
  if (item.knowledge === "unheard" && !proposalRevealedScenarios.has(item.id)) {
    secrets.push(item.playerVisible.rumour, item.playerVisible.lead);
  }
  if (!revealed.has(item.secretBindings.truth)) secrets.push(item.gmOnly.truth);
  collectInvestigatedSecret(item, revealed, secrets);
  collectUnrevealedEventSecrets(item, revealed, secrets);
}

function collectInvestigatedSecret(
  item: ScenarioItem,
  revealed: Set<string>,
  secrets: string[],
): void {
  const binding = item.secretBindings.ifInvestigated;
  if (item.gmOnly.ifInvestigated && binding && !revealed.has(binding)) {
    secrets.push(item.gmOnly.ifInvestigated);
  }
}

function collectUnrevealedEventSecrets(
  item: ScenarioItem,
  revealed: Set<string>,
  secrets: string[],
): void {
  for (const event of item.events) {
    if (event.visibility !== "gm") continue;
    const binding = item.secretBindings.eventIds[event.id];
    if (!binding || !revealed.has(binding)) secrets.push(event.text);
  }
}

function collectHiddenSecretSources(
  turn: EvaluationTurn,
  sourceSession: AdventureSession,
  secrets: string[],
): void {
  const revealedSecrets = new Set(
    turn.proposal.kind === "complete" ? turn.proposal.revealSecretIds : [],
  );
  for (const secret of sourceSession.hiddenState.secrets) {
    if (secret.status === "hidden" && !revealedSecrets.has(secret.id)) {
      secrets.push(secret.text);
    }
  }
}

function collectSecretLeakageSources(
  turn: EvaluationTurn,
  canaries: string[],
): string[] {
  const secrets = [
    ...canaries,
    ...(turn.canaries ?? []),
    ...(turn.gmOnlyLore ?? []),
  ];
  const sourceSession = turn.session ?? turn.previousSession;
  if (sourceSession) {
    collectScenarioSecretSources(turn, sourceSession, secrets);
    collectHiddenSecretSources(turn, sourceSession, secrets);
  }
  if (turn.proposal.kind === "complete" && turn.proposal.timeAdvance) {
    secrets.push(
      ...turn.proposal.timeAdvance.developments.map((dev) => dev.text),
    );
  }
  return secrets.map(normalizeText).filter((value) => value.length > 0);
}

export function scorePlayerAgency(turn: EvaluationTurn): number {
  const texts = [turn.narration];
  if (turn.proposal.kind === "roll-required" && turn.proposal.setupNarration) {
    texts.push(turn.proposal.setupNarration);
  }
  const combined = texts.join("\n");
  if (FORCED_ACTION_PATTERN.test(combined)) return 0;

  const name = turn.playerCharacterName?.trim();
  if (!name) return 1;
  const pattern = new RegExp(
    `\\b${escapeRegExp(name)}\\b\\s+(decides|chooses|says|thinks|feels|does)`,
    "i",
  );
  return pattern.test(combined) ? 0 : 1;
}

export function scoreSecrecy(
  turn: EvaluationTurn,
  canaries: string[] = [],
): number {
  const session = turn.previousSession ?? turn.session;
  if (session && detectHiddenLeakage(session, turn.proposal).length > 0) {
    return 0;
  }

  const playerTexts = collectPlayerFacingTexts(turn).map(normalizeText);
  if (session) {
    for (const text of playerTexts) {
      if (detectHiddenTextLeakage(session, text).length > 0) return 0;
    }
  }

  const secrets = collectSecretLeakageSources(turn, canaries);
  for (const secret of secrets) {
    if (playerTexts.some((text) => text.includes(secret))) return 0;
  }

  return 1;
}

function scenarioProgressionValid(
  prev: ScenarioItem,
  next: ScenarioItem,
): boolean {
  if (prev.knowledge === "heard" && next.knowledge === "unheard") return false;
  if (prev.status !== "open" && next.status === "open") return false;
  return STAGE_ORDER[next.stage] >= STAGE_ORDER[prev.stage];
}

export function scoreContinuity(turn: EvaluationTurn): number {
  const next = turn.session;
  const prev = turn.previousSession;
  if (!next) return 1;
  if (!hasValidCurrentPlace(next) || !hasUniqueVisibleIds(next)) return 0;
  if (!prev) return 1;
  return hasMonotonicTime(prev, next) &&
    retainsPeople(prev, next) &&
    progressesScenarios(prev, next) &&
    resolvesPendingRoll(turn, prev, next)
    ? 1
    : 0;
}

function hasValidCurrentPlace(session: AdventureSession): boolean {
  return (
    !session.currentPlaceId ||
    (session.places ?? []).some((place) => place.id === session.currentPlaceId)
  );
}

function hasUniqueVisibleIds(session: AdventureSession): boolean {
  return (
    uniqueIds(session.visibleState.activeCharacters) &&
    uniqueIds(session.visibleState.knownFacts) &&
    (!session.people || uniqueIds(session.people))
  );
}

function hasMonotonicTime(
  prev: AdventureSession,
  next: AdventureSession,
): boolean {
  return (
    (next.worldTime?.elapsedMinutes ?? 0) >=
    (prev.worldTime?.elapsedMinutes ?? 0)
  );
}

function retainsPeople(
  prev: AdventureSession,
  next: AdventureSession,
): boolean {
  const nextIds = new Set((next.people ?? []).map((person) => person.id));
  return (prev.people ?? []).every((person) => nextIds.has(person.id));
}

function progressesScenarios(
  prev: AdventureSession,
  next: AdventureSession,
): boolean {
  const previous = new Map(
    (prev.scenarioCollection?.items ?? []).map((item) => [item.id, item]),
  );
  return (next.scenarioCollection?.items ?? []).every((item) => {
    const before = previous.get(item.id);
    return !before || scenarioProgressionValid(before, item);
  });
}

function resolvesPendingRoll(
  turn: EvaluationTurn,
  prev: AdventureSession,
  next: AdventureSession,
): boolean {
  if (
    !prev.pendingRoll ||
    turn.proposal.kind !== "complete" ||
    next.turns.length <= prev.turns.length
  )
    return true;
  return Boolean(next.turns.at(-1)?.resolvedRoll);
}

export function scoreCanonSafety(turn: EvaluationTurn): number {
  const next = turn.session;
  const prev = turn.previousSession;
  const canonicalSources = (next ?? prev)?.sourceRecords ?? [];
  const canonicalTitles = new Set(
    canonicalSources.map((record) => normalizeText(record.displayName)),
  );

  return !hasProvisionalCanonicalFacts(turn, next, canonicalTitles) &&
    !hasUnattributedCanonicalFacts(next) &&
    !mutatesCanon(prev, next)
    ? 1
    : 0;
}

function hasProvisionalCanonicalFacts(
  turn: EvaluationTurn,
  next: AdventureSession | undefined,
  canonicalTitles: Set<string>,
): boolean {
  const proposalFacts =
    turn.proposal.kind === "complete" ? turn.proposal.provisionalFacts : [];
  return [...proposalFacts, ...(next?.provisionalFacts ?? [])].some((fact) =>
    canonicalTitles.has(normalizeText(fact.name)),
  );
}

function hasUnattributedCanonicalFacts(
  next: AdventureSession | undefined,
): boolean {
  if (!next) return false;
  const visible = [
    ...next.visibleState.knownFacts,
    ...next.visibleState.activeCharacters,
    ...next.visibleState.objectives,
  ];
  return visible.some(
    (fact) => fact.source === "canonical" && !fact.sourceRecordId,
  );
}

function mutatesCanon(
  prev: AdventureSession | undefined,
  next: AdventureSession | undefined,
): boolean {
  if (!prev || !next) return false;
  const nextById = new Map(
    next.sourceRecords.map((record) => [record.recordId, record]),
  );
  if (
    prev.sourceRecords.some((old) => {
      const current = nextById.get(old.recordId);
      return (
        !current ||
        current.displayName !== old.displayName ||
        current.recordType !== old.recordType
      );
    })
  )
    return true;
  return demotesCanonicalFacts(prev, next);
}

function demotesCanonicalFacts(
  prev: AdventureSession,
  next: AdventureSession,
): boolean {
  const previousIds = new Set(
    [...prev.visibleState.knownFacts, ...prev.visibleState.activeCharacters]
      .filter((fact) => fact.source === "canonical")
      .map((fact) => fact.id),
  );
  return [
    ...next.visibleState.knownFacts,
    ...next.visibleState.activeCharacters,
  ].some((fact) => previousIds.has(fact.id) && fact.source !== "canonical");
}

function validateProposalConsequences(turn: EvaluationTurn): boolean {
  if (turn.proposal.kind !== "complete") return true;
  const baseline = turn.previousSession ?? turn.session;
  if (!baseline) return true;
  return (
    hasValidDevelopmentThreads(turn.proposal, baseline) &&
    hasValidElaborations(turn.proposal, baseline)
  );
}

function hasValidDevelopmentThreads(
  proposal: Extract<AdventureTurnProposal, { kind: "complete" }>,
  baseline: AdventureSession,
): boolean {
  if (!proposal.timeAdvance) return true;
  const validIds = new Set([
    ...baseline.hiddenState.gmThreads.map((thread) => thread.id),
    ...(baseline.scenarioCollection?.items ?? [])
      .filter((scenario) => scenario.status === "open")
      .map((scenario) => scenario.id),
  ]);
  return proposal.timeAdvance.developments.every((item) =>
    validIds.has(item.threadId),
  );
}

function hasValidElaborations(
  proposal: Extract<AdventureTurnProposal, { kind: "complete" }>,
  baseline: AdventureSession,
): boolean {
  const newlyRevealed = new Set(proposal.revealScenarioIds ?? []);
  const scenarios = new Map(
    (baseline.scenarioCollection?.items ?? []).map((scenario) => [
      scenario.id,
      scenario,
    ]),
  );
  return (proposal.elaborateScenarios ?? []).every((elaboration) => {
    if (newlyRevealed.has(elaboration.scenarioId)) return false;
    const scenario = scenarios.get(elaboration.scenarioId);
    return Boolean(
      scenario &&
      scenario.knowledge === "heard" &&
      scenario.status === "open" &&
      STAGE_ORDER[elaboration.stage] - STAGE_ORDER[scenario.stage] === 1,
    );
  });
}

function validatePropagatedEvents(
  session: AdventureSession | undefined,
): boolean {
  if (!session?.scenarioCollection) return true;
  const byId = new Map(
    session.scenarioCollection.items.map((item) => [item.id, item]),
  );
  return session.scenarioCollection.items.every((target) =>
    target.events.every((event) => isValidPropagatedEvent(target, event, byId)),
  );
}

function isValidPropagatedEvent(
  target: ScenarioItem,
  event: ScenarioItem["events"][number],
  byId: Map<string, ScenarioItem>,
): boolean {
  if (!event.causedBy) return true;
  if (event.visibility !== "player" || event.kind !== "consequence")
    return false;
  const source = byId.get(event.causedBy.scenarioId);
  if (!source || source.id === target.id) return false;
  if (!hasSharedPropagationAnchor(source, target, event.causedBy.anchorRef)) {
    return false;
  }
  const origin = source.events.find(
    (candidate) => candidate.id === event.causedBy?.eventId,
  );
  return Boolean(
    origin && origin.visibility === "player" && origin.causedBy === undefined,
  );
}

function hasSharedPropagationAnchor(
  source: ScenarioItem,
  target: ScenarioItem,
  anchorRef: string,
): boolean {
  return (
    source.anchorRefs.includes(anchorRef) &&
    target.anchorRefs.includes(anchorRef)
  );
}

export function scoreConsequenceCredibility(turn: EvaluationTurn): number {
  if (!validateProposalConsequences(turn)) return 0;
  if (!validatePropagatedEvents(turn.session)) return 0;
  return 1;
}

export function scoreUnnecessaryEscalation(turn: EvaluationTurn): number {
  const action = turn.playerAction?.trim() ?? "";
  if (!action || !DECLINED_OR_ORDINARY_ACTION_PATTERN.test(action)) return 1;

  const narration =
    turn.proposal.kind === "complete"
      ? turn.narration
      : (turn.proposal.setupNarration ?? turn.narration);

  if (FORCED_ESCALATION_PATTERN.test(narration)) return 0;

  if (turn.proposal.kind === "complete") {
    if (turn.proposal.visiblePatch.objectives.add.length > 0) return 0;
    if ((turn.proposal.elaborateScenarios?.length ?? 0) > 0) return 0;
  }

  return 1;
}

export function evaluateAdventureTurn(
  turn: EvaluationTurn,
  canaries: string[] = [],
): TurnEvaluationResult {
  const scores: RubricScores = {
    agency: scorePlayerAgency(turn),
    secrecy: scoreSecrecy(turn, canaries),
    continuity: scoreContinuity(turn),
    canonSafety: scoreCanonSafety(turn),
    consequenceCredibility: scoreConsequenceCredibility(turn),
    unnecessaryEscalation: scoreUnnecessaryEscalation(turn),
  };
  const failures = (Object.keys(scores) as RubricDimension[]).filter(
    (dimension) => scores[dimension] < 1,
  );
  return {
    scores,
    passed: failures.length === 0,
    failures,
  };
}

export function evaluateAdventureRun(
  turns: EvaluationTurn[],
  canaries: string[] = [],
): RunEvaluationResult {
  const evaluated = turns.map((turn) => evaluateAdventureTurn(turn, canaries));
  const scores: RubricScores = {
    agency: aggregateScores(evaluated.map((item) => item.scores.agency)),
    secrecy: aggregateScores(evaluated.map((item) => item.scores.secrecy)),
    continuity: aggregateScores(
      evaluated.map((item) => item.scores.continuity),
    ),
    canonSafety: aggregateScores(
      evaluated.map((item) => item.scores.canonSafety),
    ),
    consequenceCredibility: aggregateScores(
      evaluated.map((item) => item.scores.consequenceCredibility),
    ),
    unnecessaryEscalation: aggregateScores(
      evaluated.map((item) => item.scores.unnecessaryEscalation),
    ),
  };
  const failures = (Object.keys(scores) as RubricDimension[]).filter(
    (dimension) => scores[dimension] < 1,
  );
  return {
    scores,
    passed: failures.length === 0,
    failures,
    turns: evaluated,
  };
}

export function aggregateScores(scores: number[]): number {
  return scores.length === 0
    ? 1
    : scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

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

function playerVisibleProposalPayload(proposal: AdventureTurnProposal): unknown {
  if (proposal.kind === "complete") {
    const { hiddenPatch: _hidden, timeAdvance, ...visible } = proposal;
    return {
      ...visible,
      ...(timeAdvance
        ? { timeAdvance: { minutes: timeAdvance.minutes, cause: timeAdvance.cause } }
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

function collectSecretLeakageSources(
  turn: EvaluationTurn,
  canaries: string[],
): string[] {
  const secrets = [...canaries, ...(turn.canaries ?? []), ...(turn.gmOnlyLore ?? [])];
  const sourceSession = turn.session ?? turn.previousSession;
  const proposalRevealedSecrets = new Set(
    turn.proposal.kind === "complete" ? turn.proposal.revealSecretIds : [],
  );
  const proposalRevealedScenarios = new Set(
    turn.proposal.kind === "complete"
      ? (turn.proposal.revealScenarioIds ?? [])
      : [],
  );
  if (sourceSession) {
    for (const item of sourceSession.scenarioCollection?.items ?? []) {
      const revealed = new Set([
        ...item.revealedSecretIds,
        ...proposalRevealedSecrets,
      ]);
      if (item.knowledge === "unheard" && !proposalRevealedScenarios.has(item.id)) {
        secrets.push(item.playerVisible.rumour, item.playerVisible.lead);
      }
      if (!revealed.has(item.secretBindings.truth)) {
        secrets.push(item.gmOnly.truth);
      }
      if (
        item.gmOnly.ifInvestigated &&
        item.secretBindings.ifInvestigated &&
        !revealed.has(item.secretBindings.ifInvestigated)
      ) {
        secrets.push(item.gmOnly.ifInvestigated);
      }
      for (const event of item.events) {
        if (event.visibility === "gm") {
          const binding = item.secretBindings.eventIds[event.id];
          if (!binding || !revealed.has(binding)) secrets.push(event.text);
        }
      }
    }
    for (const secret of sourceSession.hiddenState.secrets) {
      if (
        secret.status === "hidden" &&
        !proposalRevealedSecrets.has(secret.id)
      ) {
        secrets.push(secret.text);
      }
    }
  }
  if (turn.proposal.kind === "complete" && turn.proposal.timeAdvance) {
    for (const dev of turn.proposal.timeAdvance.developments) {
      secrets.push(dev.text);
    }
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

  if (next.currentPlaceId) {
    const hasPlace = (next.places ?? []).some(
      (place) => place.id === next.currentPlaceId,
    );
    if (!hasPlace) return 0;
  }
  if (!uniqueIds(next.visibleState.activeCharacters)) return 0;
  if (!uniqueIds(next.visibleState.knownFacts)) return 0;
  if (next.people && !uniqueIds(next.people)) return 0;

  if (!prev) return 1;

  const prevElapsed = prev.worldTime?.elapsedMinutes ?? 0;
  const nextElapsed = next.worldTime?.elapsedMinutes ?? 0;
  if (nextElapsed < prevElapsed) return 0;

  const prevPeopleIds = new Set((prev.people ?? []).map((p) => p.id));
  const nextPeopleIds = new Set((next.people ?? []).map((p) => p.id));
  for (const id of prevPeopleIds) {
    if (!nextPeopleIds.has(id)) return 0;
  }

  const prevScenarios = new Map(
    (prev.scenarioCollection?.items ?? []).map((item) => [item.id, item]),
  );
  for (const item of next.scenarioCollection?.items ?? []) {
    const before = prevScenarios.get(item.id);
    if (before && !scenarioProgressionValid(before, item)) return 0;
  }

  if (
    prev.pendingRoll &&
    turn.proposal.kind === "complete" &&
    next.turns.length > prev.turns.length
  ) {
    const latest = next.turns[next.turns.length - 1];
    if (!latest?.resolvedRoll) return 0;
  }

  return 1;
}

export function scoreCanonSafety(turn: EvaluationTurn): number {
  const next = turn.session;
  const prev = turn.previousSession;
  const canonicalSources = (next ?? prev)?.sourceRecords ?? [];
  const canonicalTitles = new Set(
    canonicalSources.map((record) => normalizeText(record.displayName)),
  );

  if (turn.proposal.kind === "complete") {
    for (const fact of turn.proposal.provisionalFacts) {
      if (canonicalTitles.has(normalizeText(fact.name))) return 0;
    }
  }

  if (next) {
    for (const fact of next.provisionalFacts) {
      if (canonicalTitles.has(normalizeText(fact.name))) return 0;
    }
    const allVisible = [
      ...next.visibleState.knownFacts,
      ...next.visibleState.activeCharacters,
      ...next.visibleState.objectives,
    ];
    for (const fact of allVisible) {
      if (fact.source === "canonical" && !fact.sourceRecordId) return 0;
    }
  }

  if (prev && next) {
    const nextById = new Map(
      next.sourceRecords.map((record) => [record.recordId, record]),
    );
    for (const oldRecord of prev.sourceRecords) {
      const current = nextById.get(oldRecord.recordId);
      if (
        !current ||
        current.displayName !== oldRecord.displayName ||
        current.recordType !== oldRecord.recordType
      ) {
        return 0;
      }
    }
    const prevCanonicalIds = new Set(
      [
        ...prev.visibleState.knownFacts,
        ...prev.visibleState.activeCharacters,
      ]
        .filter((fact) => fact.source === "canonical")
        .map((fact) => fact.id),
    );
    for (const fact of [
      ...next.visibleState.knownFacts,
      ...next.visibleState.activeCharacters,
    ]) {
      if (prevCanonicalIds.has(fact.id) && fact.source !== "canonical") {
        return 0;
      }
    }
  }

  return 1;
}

function validateProposalConsequences(turn: EvaluationTurn): boolean {
  if (turn.proposal.kind !== "complete") return true;
  const baseline = turn.previousSession ?? turn.session;
  if (!baseline) return true;

  if (turn.proposal.timeAdvance) {
    const validThreadIds = new Set([
      ...baseline.hiddenState.gmThreads.map((t) => t.id),
      ...(baseline.scenarioCollection?.items ?? [])
        .filter((s) => s.status === "open")
        .map((s) => s.id),
    ]);
    for (const dev of turn.proposal.timeAdvance.developments) {
      if (!validThreadIds.has(dev.threadId)) return false;
    }
  }

  const newlyRevealed = new Set(turn.proposal.revealScenarioIds ?? []);
  const scenarioById = new Map(
    (baseline.scenarioCollection?.items ?? []).map((s) => [s.id, s]),
  );
  for (const elaboration of turn.proposal.elaborateScenarios ?? []) {
    if (newlyRevealed.has(elaboration.scenarioId)) return false;
    const item = scenarioById.get(elaboration.scenarioId);
    if (!item || item.knowledge !== "heard" || item.status !== "open") {
      return false;
    }
    const delta = STAGE_ORDER[elaboration.stage] - STAGE_ORDER[item.stage];
    if (delta !== 1) return false;
  }
  return true;
}

function validatePropagatedEvents(session: AdventureSession | undefined): boolean {
  if (!session?.scenarioCollection) return true;
  const byId = new Map(
    session.scenarioCollection.items.map((item) => [item.id, item]),
  );
  for (const target of session.scenarioCollection.items) {
    for (const event of target.events) {
      if (!event.causedBy) continue;
      if (event.visibility !== "player" || event.kind !== "consequence") {
        return false;
      }
      const source = byId.get(event.causedBy.scenarioId);
      if (!source || source.id === target.id) return false;
      if (
        !source.anchorRefs.includes(event.causedBy.anchorRef) ||
        !target.anchorRefs.includes(event.causedBy.anchorRef)
      ) {
        return false;
      }
      const sourceEvent = source.events.find(
        (candidate) => candidate.id === event.causedBy?.eventId,
      );
      if (
        !sourceEvent ||
        sourceEvent.visibility !== "player" ||
        sourceEvent.causedBy !== undefined
      ) {
        return false;
      }
    }
  }
  return true;
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
    continuity: aggregateScores(evaluated.map((item) => item.scores.continuity)),
    canonSafety: aggregateScores(evaluated.map((item) => item.scores.canonSafety)),
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

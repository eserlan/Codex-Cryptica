export type AdventureStatus = "active" | "archived";
export type ProposalKind = "complete" | "roll-required";
export type RollResolutionStatus = "awaiting-outcome" | "ready-to-resolve";
export type SourceAvailability = "available" | "unavailable";

export interface PlayerCharacterCanonical {
  kind: "canonical";
  recordId: string;
  name: string;
}

export interface PlayerCharacterProvisional {
  kind: "provisional";
  name: string;
  description: string;
}

export type PlayerCharacter =
  PlayerCharacterCanonical | PlayerCharacterProvisional;

export interface StateFact {
  id: string;
  text: string;
  source: "canonical" | "provisional" | "revealed-secret";
  sourceRecordId?: string;
  /** Where this fact belongs. Absent means it applies everywhere (legacy and unplaced facts). */
  placeId?: string;
}

/** A named place the player has been to, kept so facts and people can be tied to it. */
export interface Place {
  id: string;
  name: string;
  /** Vault record this place stands for, when it is canonical. */
  sourceRecordId?: string;
  /** How it relates to other places, in plain words, e.g. "below Tiny village". */
  relation?: string;
}

/** The model's declaration that the player has changed place. Never needed for scene changes inside one place. */
export interface PlaceMoveProposal {
  /** An existing place's id. */
  placeId?: string;
  /** A place name, for a place not yet recorded or to match one by name. */
  name?: string;
  relation?: string;
}

export interface RelationshipFact extends StateFact {
  subjectId: string;
  disposition: string;
}

export interface VisibleAdventureState {
  location?: StateFact;
  situation?: StateFact;
  objectives: StateFact[];
  activeCharacters: StateFact[];
  knownFacts: StateFact[];
  relationships: RelationshipFact[];
}

export interface HiddenSecret {
  id: string;
  text: string;
  revealCondition?: string;
  status: "hidden" | "revealed";
  revealedOnTurnId?: string;
}

export interface HiddenThread {
  id: string;
  text: string;
  status: "hidden" | "revealed";
  revealCondition?: string;
}

export interface HiddenAdventureState {
  secrets: HiddenSecret[];
  gmThreads: HiddenThread[];
}

export interface SourceRecordReference {
  recordId: string;
  recordType: string;
  displayName: string;
  role: "player-character" | "anchor" | "turn-source";
  availability: SourceAvailability;
  lastResolvedAt?: string;
}

export interface ProvisionalFact {
  id: string;
  kind: "person" | "place" | "faction" | "item" | "event" | "clue" | "other";
  name: string;
  summary: string;
  introducedOnTurnId: string;
  visibility: "player-visible" | "gm-only";
  scenarioId?: string;
}

/**
 * One dice group or modifier from a resolved roll's trace. Structurally the
 * same shape as `dice-engine`'s `PartResult` (#3443), but declared locally
 * so this engine takes no dependency on it: the app layer hands over its own
 * `RollResult.parts` and this type only describes what the engine persists.
 */
export interface RollTracePart {
  type: "dice" | "modifier";
  value: number;
  sides?: number;
  rolls?: number[];
  dropped?: number[];
}

export interface SuppliedRollOutcome {
  kind: "narrative" | "numeric";
  value: string | number;
  label?: string;
  /**
   * The individual dice behind `value`, when it came from a real roll rather
   * than a narrative outcome the player typed in. Persisted as-is on the
   * committed turn (see `ResolvedRollSnapshot`) so a later "show the dice"
   * view never has to reconstruct a roll from its total (#3443).
   */
  parts?: RollTracePart[];
}

export interface OutcomeBand {
  id: string;
  label: string;
  minimum?: number;
  maximum?: number;
}

export interface PendingRoll {
  id: string;
  inputId: string;
  playerAction: string;
  setupNarration?: string;
  uncertainty: string;
  stakes: string;
  dice?: { expression: string; bands: OutcomeBand[] };
  resolutionStatus: RollResolutionStatus;
  suppliedOutcome?: SuppliedRollOutcome;
  createdAt: string;
  outcomeRecordedAt?: string;
  suggestedActions?: string[];
}

export interface CollectionPatch<T> {
  add: T[];
  update: T[];
  removeIds: string[];
}

/** Facts created by a generation. Their durable IDs are assigned at commit time. */
export type NewStateFact = Omit<StateFact, "id">;
export type NewRelationshipFact = Omit<RelationshipFact, "id">;
export type NewHiddenSecret = Omit<HiddenSecret, "id" | "revealedOnTurnId">;
export type NewHiddenThread = Omit<HiddenThread, "id">;
export type NewProvisionalFact = Omit<
  ProvisionalFact,
  "id" | "introducedOnTurnId"
>;

/** A model proposal may only name IDs when it updates or removes existing state. */
export interface ProposalCollectionPatch<T, TNew = Omit<T, "id">> {
  add: TNew[];
  update: T[];
  removeIds: string[];
}

export interface VisibleStatePatch {
  location?: StateFact | null;
  situation?: StateFact | null;
  objectives: CollectionPatch<StateFact>;
  activeCharacters: CollectionPatch<StateFact>;
  knownFacts: CollectionPatch<StateFact>;
  relationships: CollectionPatch<RelationshipFact>;
}

export interface HiddenStatePatch {
  secrets: CollectionPatch<HiddenSecret>;
  gmThreads: CollectionPatch<HiddenThread>;
}

export interface VisibleStateProposalPatch {
  location?: NewStateFact | null;
  situation?: NewStateFact | null;
  objectives: ProposalCollectionPatch<StateFact, NewStateFact>;
  activeCharacters: ProposalCollectionPatch<StateFact, NewStateFact>;
  knownFacts: ProposalCollectionPatch<StateFact, NewStateFact>;
  relationships: ProposalCollectionPatch<RelationshipFact, NewRelationshipFact>;
}

export interface HiddenStateProposalPatch {
  secrets: ProposalCollectionPatch<HiddenSecret, NewHiddenSecret>;
  gmThreads: ProposalCollectionPatch<HiddenThread, NewHiddenThread>;
}

/** Snapshot of a resolved roll, captured on the turn that resolved it. See data-model.md "Resolved Roll snapshot". */
export interface ResolvedRollSnapshot {
  expression?: string;
  bands?: OutcomeBand[];
  outcome: SuppliedRollOutcome;
}

/** Elapsed fictional time and up to three causal GM-only NPC/situation updates. */
export interface TimeAdvanceProposal {
  minutes: number;
  cause: string;
  developments: Array<{ threadId: string; text: string }>;
}

export interface WorldTimeState {
  version: 1;
  /** Minutes since the in-world scene began; no device clock arithmetic. */
  elapsedMinutes: number;
  /** Private event ledger. Never include in player transcript. */
  events: Array<{
    id: string;
    turnId: string;
    atMinute: number;
    threadId: string;
    text: string;
  }>;
}

export interface CommittedAdventureTurn {
  id: string;
  sequence: number;
  inputId: string;
  playerAction: string;
  rollOutcome?: SuppliedRollOutcome;
  /** Set once, at commit time, when this turn resolves the session's pendingRoll. Never mutated afterward. */
  resolvedRoll?: ResolvedRollSnapshot;
  narration: string;
  visiblePatch: VisibleStatePatch;
  hiddenPatch: HiddenStatePatch;
  revealedSecretIds: string[];
  sourceRecordIds: string[];
  provisionalFactIds: string[];
  committedAt: string;
  /** Player-safe time interval; private developments live in worldTime. */
  timeAdvance?: { minutes: number; cause: string };
  suggestedActions?: string[];
}

/** A user-named, reusable dice expression. Convenience only — never changes when Oracle requests a roll. */
export interface DicePreset {
  id: string;
  label: string;
  expression: string;
  createdAt: string;
}

/** A user-named, system-agnostic numeric value scoped to an adventure (e.g. ammo, favor, a countdown). */
export interface ResourceCounter {
  id: string;
  label: string;
  value: number;
  createdAt: string;
  updatedAt: string;
}

/** A lightweight situation, never a mandatory quest or separate play session. */
export type ScenarioStatus = "open" | "resolved" | "abandoned";

export interface KnownLeadRecap {
  id: string;
  lead: string;
  status: ScenarioStatus;
  focused: boolean;
  lastUpdate?: string;
}

/**
 * Speculative GM-only actor intention and progression model.
 * Distinct from committed ScenarioEvent history.
 */
export interface ScenarioPressure {
  actor: string;
  goal: string;
  currentStance: string;
  trigger: string;
  progression: string;
  expectedConsequence: string;
  /** Optional deterministic fictional elapsed minutes threshold for AI-off advancement. */
  triggerAfterMinutes?: number;
  /** Fictional minute when the expected consequence was triggered (at most once). */
  triggeredAtMinute?: number;
}

export interface ScenarioSeed {
  id: string;
  origin: {
    kind: "rumour" | "manual";
    batchTitle?: string;
    batchId?: string;
    manualId?: string;
    legacySessionId?: string;
    legacyScenarioId?: string;
    index?: number;
    sourceRecordId?: string;
    sourceFingerprint?: string;
  };
  playerVisible: { rumour: string; lead: string; source?: string };
  gmOnly: { truth: string; ifInvestigated?: string };
  pressure?: ScenarioPressure;
}

export interface ScenarioEvent {
  id: string;
  kind: "discovery" | "consequence" | "status-change" | "theory";
  visibility: "player" | "gm";
  text: string;
  at: string;
  turnId?: string;
  /** Provenance for an explicitly linked cross-scenario consequence. */
  causedBy?: {
    scenarioId: string;
    eventId: string;
    anchorRef: string;
  };
}

/** Progressive elaboration depth of a situation. */
export type ScenarioElaborationStage =
  "hearsay" | "actionable-clue" | "revelation-crisis";

export interface ScenarioState extends ScenarioSeed {
  version: 1;
  status: ScenarioStatus;
  stage: ScenarioElaborationStage;
  events: ScenarioEvent[];
}

export interface ScenarioItem extends ScenarioState {
  knowledge: "unheard" | "heard";
  anchorRefs: string[];
  revealedSecretIds: string[];
  secretBindings: {
    truth: string;
    ifInvestigated?: string;
    eventIds: Record<string, string>;
  };
}

export interface ScenarioCollection {
  version: 1;
  items: ScenarioItem[];
  focusedScenarioId: string | null;
}

/** A canonical or provisional place for unscripted entry into a Vault. */
export interface WorldEntryContext {
  version: 1;
  location:
    | { kind: "canonical"; recordId: string; name: string }
    | { kind: "provisional"; name: string };
  /** Exact date precision is retained; an absent date is explicitly unspecified. */
  at?: {
    year: number;
    month?: number;
    day?: number;
    precision?: "year" | "unit" | "day" | "anchor";
    unitId?: string;
    anchorId?: string;
    calendarRevision?: number;
    label?: string;
  };
  intent: "explore" | "scene" | "opportunity";
  scenePrompt?: string;
}

export interface AdventureSession {
  schemaVersion: 3;
  id: string;
  vaultId: string;
  title: string;
  status: AdventureStatus;
  createdAt: string;
  updatedAt: string;
  lastPlayedAt: string;
  revision: number;
  playerCharacter: PlayerCharacter;
  premise: string;
  sourceRecords: SourceRecordReference[];
  /** Optional structured situations; absent on ordinary adventures. */
  scenarioCollection?: ScenarioCollection;
  /** Additive world-entry setup; absent in old and ordinary adventures. */
  worldEntry?: WorldEntryContext;
  /** Optional for backwards-compatible local-first sessions. */
  worldTime?: WorldTimeState;
  /** Places visited so far. Absent on sessions from before places existed. */
  places?: Place[];
  /** Where the player is now. Absent when unknown; unplaced facts then apply everywhere. */
  currentPlaceId?: string;
  visibleState: VisibleAdventureState;
  hiddenState: HiddenAdventureState;
  provisionalFacts: ProvisionalFact[];
  /** Review decisions, separate from immutable committed discovery history. */
  dismissedProvisionalFactIds?: string[];
  turns: CommittedAdventureTurn[];
  pendingRoll: PendingRoll | null;
  /** Phase 2, additive. Absent/empty on a schemaVersion 1 document. */
  dicePresets: DicePreset[];
  /** Phase 2, additive. Absent/empty on a schemaVersion 1 document. */
  resourceCounters: ResourceCounter[];
}

export interface ScenarioElaborationProposal {
  scenarioId: string;
  stage: ScenarioElaborationStage;
  discovery?: string;
}

export interface CompletedTurnProposal {
  kind: "complete";
  narration: string;
  timeAdvance?: TimeAdvanceProposal;
  /** Set only when the player changes place in this turn. */
  moveTo?: PlaceMoveProposal;
  visiblePatch: VisibleStateProposalPatch;
  hiddenPatch: HiddenStateProposalPatch;
  revealSecretIds: string[];
  /** Scenario leads fictionally disclosed in this same committed turn. */
  revealScenarioIds?: string[];
  /** Scenarios escalated along the progressive elaboration ladder in this turn. */
  elaborateScenarios?: ScenarioElaborationProposal[];
  provisionalFacts: NewProvisionalFact[];
  sourceRecordIds: string[];
  suggestedActions?: string[];
}

export interface RollRequiredProposal {
  kind: "roll-required";
  setupNarration?: string;
  uncertainty: string;
  stakes: string;
  dice?: { expression: string; outcomeBands: OutcomeBand[] };
  sourceRecordIds: string[];
  suggestedActions?: string[];
}

export type AdventureTurnProposal =
  CompletedTurnProposal | RollRequiredProposal;

export interface CommitMetadata {
  turnId: string;
  inputId: string;
  now: string;
  playerAction?: string;
}

export interface AdventureValidationError {
  code:
    | "invalid-schema"
    | "invalid-transition"
    | "duplicate-input"
    | "unknown-fact"
    | "conflicting-patch"
    | "unknown-secret"
    | "hidden-leakage"
    | "canon-conflict"
    | "invalid-roll"
    | "state-budget-exceeded"
    | "id-allocation-failed"
    | "incompatible-version";
  message: string;
}

export type Result<T, E> = { ok: true; value: T } | { ok: false; errors: E };

export interface PlayerTranscriptTurn {
  sequence: number;
  playerAction: string;
  narration: string;
  committedAt: string;
}

export interface PlayerTranscript {
  sessionId: string;
  title: string;
  turns: PlayerTranscriptTurn[];
}

export interface ResolvedSourceExcerpt {
  recordId: string;
  displayName: string;
  content: string;
  /** Vault lore is GM-only; never player-visible without a fictional reveal. */
  lore?: string;
  role: SourceRecordReference["role"];
}

/**
 * A deterministic, client-side render of committed visible state and recent
 * transcript. No field here may ever be sourced from HiddenAdventureState —
 * see research.md "Recap and visible-state inspection".
 */
export interface AdventureRecap {
  location?: StateFact;
  situation?: StateFact;
  objectives: StateFact[];
  activeCharacters: StateFact[];
  knownFacts: StateFact[];
  recentTurnSummaries: string[];
  elapsedTimeLabel?: string;
  knownLeads?: KnownLeadRecap[];
}

/** A roll history entry: a committed turn paired with the roll it resolved. */
export interface RollHistoryEntry {
  turn: CommittedAdventureTurn;
  resolvedRoll: ResolvedRollSnapshot;
}

export type StateCorrectionOutcome = "applied" | "stale-revision";

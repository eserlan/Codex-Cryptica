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
}

export interface SuppliedRollOutcome {
  kind: "narrative" | "numeric";
  value: string | number;
  label?: string;
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

export interface AdventureSession {
  schemaVersion: 1 | 2;
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
  visibleState: VisibleAdventureState;
  hiddenState: HiddenAdventureState;
  provisionalFacts: ProvisionalFact[];
  turns: CommittedAdventureTurn[];
  pendingRoll: PendingRoll | null;
  /** Phase 2, additive. Absent/empty on a schemaVersion 1 document. */
  dicePresets: DicePreset[];
  /** Phase 2, additive. Absent/empty on a schemaVersion 1 document. */
  resourceCounters: ResourceCounter[];
}

export interface CompletedTurnProposal {
  kind: "complete";
  narration: string;
  visiblePatch: VisibleStateProposalPatch;
  hiddenPatch: HiddenStateProposalPatch;
  revealSecretIds: string[];
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
}

/** A roll history entry: a committed turn paired with the roll it resolved. */
export interface RollHistoryEntry {
  turn: CommittedAdventureTurn;
  resolvedRoll: ResolvedRollSnapshot;
}

export type StateCorrectionOutcome = "applied" | "stale-revision";

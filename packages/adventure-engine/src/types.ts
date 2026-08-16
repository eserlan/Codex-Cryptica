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
}

export interface CollectionPatch<T> {
  add: T[];
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

export interface CommittedAdventureTurn {
  id: string;
  sequence: number;
  inputId: string;
  playerAction: string;
  rollOutcome?: SuppliedRollOutcome;
  narration: string;
  visiblePatch: VisibleStatePatch;
  hiddenPatch: HiddenStatePatch;
  revealedSecretIds: string[];
  sourceRecordIds: string[];
  provisionalFactIds: string[];
  committedAt: string;
}

export interface AdventureSession {
  schemaVersion: 1;
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
}

export interface CompletedTurnProposal {
  kind: "complete";
  narration: string;
  visiblePatch: VisibleStatePatch;
  hiddenPatch: HiddenStatePatch;
  revealSecretIds: string[];
  provisionalFacts: Omit<ProvisionalFact, "introducedOnTurnId">[];
  sourceRecordIds: string[];
}

export interface RollRequiredProposal {
  kind: "roll-required";
  setupNarration?: string;
  uncertainty: string;
  stakes: string;
  dice?: { expression: string; outcomeBands: OutcomeBand[] };
  sourceRecordIds: string[];
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
  role: SourceRecordReference["role"];
}

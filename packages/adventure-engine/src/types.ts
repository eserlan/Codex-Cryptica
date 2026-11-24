import type { AdventurePerson } from "./people-types";
import type { AdventureScene } from "./scene-types";
import type { HistoricalAnchor } from "./historical-anchor-types";

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
  /** Optional AdventurePerson ID linking this scene-presence entry to session.people. */
  personId?: string;
  /** Where this fact belongs. Absent means it applies everywhere (legacy and unplaced facts). */
  placeId?: string;
  /** Optional visual artwork cues emitted by the GM (used for activeCharacters). */
  cues?: string[];
}

/** A named place the player has been to, kept so facts and people can be tied to it. */
export interface Place {
  id: string;
  name: string;
  /** Vault record this place stands for, when it is canonical. */
  sourceRecordId?: string;
  /** How it relates to other places, in plain words, e.g. "below Tiny village". */
  relation?: string;
  /** Other names the story has used for it, so a variant resolves to the same place. */
  aliases?: string[];
  /** Optional visual artwork cues emitted by the GM or player. */
  cues?: string[];
}

/** The model's declaration that the player has changed place. Never needed for scene changes inside one place. */
export interface PlaceMoveProposal {
  /** An existing place's id. */
  placeId?: string;
  /** A place name, for a place not yet recorded or to match one by name. */
  name?: string;
  relation?: string;
  cues?: string[];
}

/** Notes written from player-visible text only (the player's actions and the GM's narration). */
export interface StorySoFar {
  text: string;
  /** Sequence of the last turn folded into `text`. */
  throughSequence: number;
  updatedAt: string;
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

export type EmergentThreadStatus = "open" | "resolved" | "abandoned" | "cold";

export interface EmergentThread {
  id: string;
  title: string;
  status: EmergentThreadStatus;
  provenance: "play" | "ooc" | "mixed";
  topicTokens: string[];
  linkedPersonIds: string[];
  linkedPlaceIds: string[];
  linkedFactIds: string[];
  linkedCommitmentIds: string[];
  openQuestions: string[];
  knownConsequences: string[];
  /** GM-only conjectures and outstanding developments; never exposed to players. */
  gmOnlyDevelopments: string[];
  /** Optional explicit compatible link to an authored ScenarioItem without converting it. */
  linkedScenarioId?: string;
  createdAtTurnId: string;
  updatedAtTurnId: string;
  turnCount: number;
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
  introducedOnTurnId?: string;
  sourceOocExchangeId?: string;
  provenance?: "play" | "ooc";
  supersededById?: string;
  aliases?: string[];
  visibility: "player-visible" | "gm-only";
  scenarioId?: string;
}

export type OocReplyClassification =
  | "established"
  | "hypothetical"
  | "meta-rules"
  | "canon-conflict"
  | "secret-refusal";

export interface NewOocDecision {
  kind: ProvisionalFact["kind"];
  name: string;
  summary: string;
  aliases?: string[];
  supersedesName?: string;
  visibility: ProvisionalFact["visibility"];
}

export type CausalCommitmentKind =
  "motive" | "mechanism" | "identity" | "action" | "link";

/** Epistemic class of an emergent GM commitment; source/seed truth and established facts live elsewhere. */
export type CausalCommitmentClass =
  "supporting-explanation" | "belief-testimony" | "speculative-plan";

/** Tiered actor handle: Vault record, then provisional fact, then plain name. */
export interface CausalActorRef {
  tier: "source-record" | "provisional-fact" | "name";
  value: string;
}

/**
 * A GM-only emergent causal commitment (#5111). Contested entries are
 * quarantined from the Director brief and reviewed by the user in Vault lore.
 */
export interface CausalCommitment {
  id: string;
  kind: CausalCommitmentKind;
  commitmentClass: CausalCommitmentClass;
  subject: string;
  summary: string;
  actorRef?: CausalActorRef;
  scenarioId?: string;
  status: "committed" | "contested";
  sourceTurnId: string;
  sourceRevision: number;
}

export type NewCausalCommitment = Omit<
  CausalCommitment,
  "id" | "status" | "sourceTurnId" | "sourceRevision"
> & { contested?: boolean };

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
  /** A package scene the player's own actions reached; never persisted on the turn. */
  packageSceneId?: string;
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

/**
 * Privacy-conscious generation diagnostics stamped on a committed turn.
 * Registry keys, bounded enums and counts only — never prompt bodies,
 * narration, secrets, API keys or provider raw model strings.
 * GM-only; player surfaces must never receive this.
 */
export type GenerationReasoningEffort = "low" | "medium" | "high" | "xhigh";
export type GenerationTransport = "interaction" | "stateless";
export type GenerationThreadMode = "new" | "continued" | "reset";
export type GenerationResetReason =
  | "turn-refresh"
  | "provider-expiry"
  | "model-change"
  | "source-change"
  | "scene-boundary"
  | "revision-mismatch"
  | "rejected-turn"
  | "app-lifetime"
  | "unknown";

export interface GenerationMetadata {
  /** Model registry key only; the string "unknown" when no mapping exists. */
  modelKey?: string;
  reasoningEffort?: GenerationReasoningEffort;
  /** How the reply was produced: retained provider interaction vs. stateless. */
  transport?: GenerationTransport;
  threadMode?: GenerationThreadMode;
  resetReason?: GenerationResetReason;
  requestChars?: number;
  sourceCounts?: Record<string, number>;
  /** Selected scenario IDs. GM-only. */
  scenarioIds?: string[];
  /** #5110 TurnProgressKind, classified at commit. */
  progressCategory?: string;
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
  causalCommitmentIds?: string[];
  /** Absent on pre-#5112 turns; absent fields are `unknown`, never guessed. */
  generation?: GenerationMetadata;
  committedAt: string;
  /** Player-safe time interval; private developments live in worldTime. */
  timeAdvance?: { minutes: number; cause: string };
  suggestedActions?: string[];
  /**
   * What the engine left out of this turn because the model got it wrong in a way
   * that corrupts nothing (an unknown id, a step that is not allowed yet). The turn
   * itself committed. Diagnostic only: never shown to the player or sent to the model.
   */
  dropped?: string[];
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
  kind:
    "discovery" | "consequence" | "status-change" | "theory" | "stage-change";
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

export interface AdventureSourcePackageRef {
  packageId: string;
  version: string;
  formatVersion: string;
  hash: string;
}

export type AdventureOocExchangeStatus = "pending" | "answered" | "failed";

/**
 * Out-of-character (OOC) clarification exchange. Kept separate from committed
 * narrative turns so OOC questions never advance world time, triggers, or story state.
 */
export interface AdventureOocExchange {
  id: string;
  kind: "ooc";
  question: string;
  answer?: string;
  status: AdventureOocExchangeStatus;
  classification?: OocReplyClassification;
  committedFactIds?: string[];
  conflictNotice?: string;
  errorMessage?: string;
  /** Number of committed narrative turns (`session.turns.length`) when first asked. */
  afterTurnCount: number;
  createdAt: string;
  updatedAt: string;
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
  /** Optional pinned adventure package reference; absent on unimported or legacy sessions. */
  sourcePackage?: AdventureSourcePackageRef;
  /** The pinned package's current scene; absent on sessions without a package. */
  packageProgress?: PackageProgress;
  /** Optional structured situations; absent on ordinary adventures. */
  scenarioCollection?: ScenarioCollection;
  /** Additive world-entry setup; absent in old and ordinary adventures. */
  worldEntry?: WorldEntryContext;
  /** Optional anchored historical event and continuity policy; absent on ordinary adventures. */
  historicalAnchor?: HistoricalAnchor;
  /** Optional for backwards-compatible local-first sessions. */
  worldTime?: WorldTimeState;
  /** Places visited so far. Absent on sessions from before places existed. */
  places?: Place[];
  /** Where the player is now. Absent when unknown; unplaced facts then apply everywhere. */
  currentPlaceId?: string;
  /** Opaque artwork extension; validate before display or mutation. */
  artwork?: unknown;
  /** Persistent player-visible people identities; absent on older sessions. */
  people?: AdventurePerson[];
  /** Explicit within-place scene identities; absent on older sessions. */
  scenes?: AdventureScene[];
  /** Rolling notes on turns that have left the prompt's transcript window. Absent until the first summary. */
  storySoFar?: StorySoFar;
  visibleState: VisibleAdventureState;
  hiddenState: HiddenAdventureState;
  provisionalFacts: ProvisionalFact[];
  /** GM-only emergent causal commitments (#5111); absent on older sessions. */
  causalCommitments?: CausalCommitment[];
  /** Durable player-led emergent investigation threads (#5177); separate from scenarioCollection. */
  emergentThreads?: EmergentThread[];
  /** Optional player-focused emergent thread ID; never fabricates a scenarioId. */
  focusedEmergentThreadId?: string | null;
  /** Review decisions, separate from immutable committed discovery history. */
  dismissedProvisionalFactIds?: string[];
  turns: CommittedAdventureTurn[];
  /** Optional bounded OOC clarification exchanges; separate from canonical gameplay turns. */
  oocExchanges?: AdventureOocExchange[];
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

/** A model-proposed ledger entry; the engine assigns the event ID. */
export interface PackageEventProposal {
  recordId: string;
  kind: PackageRecordKind;
  to: PackageProgressStatus;
  certainty: "claimed" | "confirmed";
  note: string;
  supersedes?: string;
}

/** A model-proposed actor state update; the engine assigns the event ID. */
export interface ActorEventProposal {
  actorId: string;
  status?: ActorProposalStatus;
  disposition?: ActorDisposition;
  fact?: string;
  certainty: "claimed" | "confirmed";
  note: string;
  supersedes?: string;
}

export interface CompletedTurnProposal {
  kind: "complete";
  narration: string;
  timeAdvance?: TimeAdvanceProposal;
  /** Set only when the player changes place in this turn. */
  moveTo?: PlaceMoveProposal;
  /** Optional artwork cues to attach to the current place if untagged. */
  placeCues?: string[];
  visiblePatch: VisibleStateProposalPatch;
  hiddenPatch: HiddenStateProposalPatch;
  revealSecretIds: string[];
  /** Scenario leads fictionally disclosed in this same committed turn. */
  revealScenarioIds?: string[];
  /** Scenarios escalated along the progressive elaboration ladder in this turn. */
  elaborateScenarios?: ScenarioElaborationProposal[];
  provisionalFacts: NewProvisionalFact[];
  /** Meaningful emergent causal commitments only; never fleeting detail. */
  causalCommitments?: NewCausalCommitment[];
  sourceRecordIds: string[];
  suggestedActions?: string[];
  /** GM-only package progress; checked by the ledger reducer. */
  packageEvents?: PackageEventProposal[];
  /** GM-only package actor progress; checked by the actor ledger reducer. */
  actorEvents?: ActorEventProposal[];
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

export type PackageRecordKind = "scene" | "encounter" | "clue" | "secret";
export type PackageProgressStatus =
  "unvisited" | "available" | "active" | "resolved" | "altered" | "skipped";
export interface PackageProgressRecord {
  id: string;
  kind: PackageRecordKind;
  status: PackageProgressStatus;
}
export interface PackageProgressEvent {
  id: string;
  turnId: string;
  recordId: string;
  kind: PackageRecordKind;
  from: PackageProgressStatus;
  to: PackageProgressStatus;
  certainty: "claimed" | "confirmed";
  note: string;
  supersedes?: string;
}
export type ActorProposalStatus = "present" | "absent" | "dead";
export type ActorProgressStatus = "unknown" | ActorProposalStatus;
export type ActorDisposition =
  "hostile" | "wary" | "neutral" | "friendly" | "allied";
export interface PackageActorState {
  actorId: string;
  status: ActorProgressStatus;
  disposition: ActorDisposition;
  facts: string[];
}
export interface PackageActorEvent {
  id: string;
  turnId: string;
  actorId: string;
  fromStatus?: ActorProgressStatus;
  status?: ActorProposalStatus;
  fromDisposition?: ActorDisposition;
  disposition?: ActorDisposition;
  fact?: string;
  certainty: "claimed" | "confirmed";
  note: string;
  supersedes?: string;
}
/** `version`, `records` and `events` are all present or all absent. */
export interface PackageProgress {
  sceneId: string;
  version?: 1;
  records?: PackageProgressRecord[];
  events?: PackageProgressEvent[];
  actors?: PackageActorState[];
  actorEvents?: PackageActorEvent[];
  revealedSecretIds?: string[];
}

export interface CommitMetadata {
  turnId: string;
  inputId: string;
  now: string;
  playerAction?: string;
  /** Scene IDs of the pinned package, so a reported scene move can be checked. */
  packageSceneIds?: readonly string[];
  /** Record ID to kind for the pinned package; turns the progress ledger on. */
  packageRecordKinds?: Readonly<Record<string, PackageRecordKind>>;
  /** Scene ID to the target scene IDs of its branches. */
  packageSceneBranches?: Readonly<Record<string, readonly string[]>>;
  /** Actor IDs of the pinned package; enables actor progress tracking. */
  packageActorIds?: readonly string[];
  /** Hidden package references and text used to reject accidental player leaks. */
  packageRecordIds?: readonly string[];
  packageGmOnlyText?: readonly string[];
  /** Map of package secret IDs to text so explicitly revealed secrets are exempted from package-text guards. */
  packageSecretTexts?: Readonly<Record<string, string>>;
  /**
   * Generation descriptor supplied by the app layer from the actual
   * transport decision. `applyCompletedTurn` stamps it on the committed
   * turn; an absent descriptor stays absent.
   */
  generation?: GenerationMetadata;
}

export type HiddenLeakageGuard =
  "scenario-secret" | "package-text" | "package-id";

/** Leak-safe classification of a commit-time secrecy rejection (never contains secret text or raw hidden IDs). */
export interface HiddenLeakageDiagnostic {
  guard: HiddenLeakageGuard;
  field: string;
  sourceRef: string;
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
  diagnostic?: HiddenLeakageDiagnostic;
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
  emergentLeads?: Array<{
    id: string;
    title: string;
    status: EmergentThreadStatus;
    focused: boolean;
    openQuestion?: string;
  }>;
}

/** A roll history entry: a committed turn paired with the roll it resolved. */
export interface RollHistoryEntry {
  turn: CommittedAdventureTurn;
  resolvedRoll: ResolvedRollSnapshot;
}

export type StateCorrectionOutcome = "applied" | "stale-revision";

import type { PromptAdventurePackage } from "./context-budget";
import type { InvestigativeRecoveryAngle } from "./investigative-pacing";
import type {
  ActorDisposition,
  ActorProgressStatus,
  AdventureSession,
  CausalCommitment,
  EmergentThreadStatus,
  PackageProgressStatus,
  ScenarioElaborationStage,
  ScenarioEvent,
} from "./types";

/** Hard upper bound for the serialized GM-only director brief. */
export const MAX_DIRECTOR_BRIEF_CHARS = 2_400;

export type DirectorActionKind =
  "investigate" | "intervene" | "travel" | "converse" | "wait" | "walk-away";

export type DirectorProvenance =
  "player-action" | "focused-scenario" | "recent-event" | "current-location";

export type DirectorConfidence = "high" | "medium" | "low";

export type DirectorScenePosture =
  | "opening"
  | "dialogue-loop"
  | "stalled-investigation"
  | "calm-conversation"
  | "progressing";

export interface DirectorCommitmentEntry {
  id: string;
  kind: CausalCommitment["kind"];
  subject: string;
  summary: string;
}

export interface DirectorPursuedScenario {
  scenarioId: string;
  provenance: DirectorProvenance;
  confidence: DirectorConfidence;
  stage: ScenarioElaborationStage;
  gmTruthRef: {
    secretId: string;
    truth: string;
    truthRevealed: boolean;
    ifInvestigatedSecretId?: string;
    ifInvestigated?: string;
  };
  established: {
    knownPlayerFacts: string[];
    latestConsequentialEvents: Array<{
      id: string;
      kind: ScenarioEvent["kind"];
      visibility: ScenarioEvent["visibility"];
      text: string;
    }>;
    actors: string[];
    committedExplanations?: DirectorCommitmentEntry[];
  };
  potential: {
    openUncertainties: string[];
    speculativeCommitments?: DirectorCommitmentEntry[];
    pressure?: {
      actor: string;
      goal: string;
      currentStance: string;
      trigger: string;
      expectedConsequence: string;
      triggeredAtMinute?: number;
    };
    nextDevelopmentKinds: string[];
  };
}

export interface DirectorPackageContext {
  sceneId?: string;
  activeRecordIds: string[];
  establishedActors: Array<{
    actorId: string;
    status: ActorProgressStatus;
    disposition: ActorDisposition;
    facts?: string[];
  }>;
  latestEvents: Array<{
    id: string;
    recordId: string;
    certainty: "claimed" | "confirmed";
    to: PackageProgressStatus;
    note: string;
  }>;
  openUncertainties: string[];
}

export interface DirectorEmergentThread {
  threadId: string;
  title: string;
  goal?: string;
  status: EmergentThreadStatus;
  provenance: "play" | "ooc" | "mixed";
  linkedScenarioId?: string;
  established: {
    knownConsequences: string[];
    openQuestions: string[];
    linkedFactCount: number;
    linkedPersonCount: number;
    linkedPlaceCount: number;
  };
  gmOnlyDevelopments?: string[];
}

export interface DirectorOutcomeSummary {
  id: string;
  source: "scenario" | "emergent";
  title: string;
  goal?: string;
  result: "achieved" | "failed" | "abandoned" | "cold";
  reason: string;
  unresolvedConsequences?: string[];
}

export interface GMDirectorBrief {
  advisory: true;
  mode: "active-pursuit" | "package-scene" | "open-world";
  scenePosture: DirectorScenePosture;
  currentPlace?: {
    id?: string;
    name: string;
    sourceRecordId?: string;
  };
  pursuedScenarios: DirectorPursuedScenario[];
  pursuedEmergentThread?: DirectorEmergentThread;
  resolvedOutcomes?: {
    scenario: DirectorOutcomeSummary[];
    emergent: DirectorOutcomeSummary[];
  };
  committedExplanations?: DirectorCommitmentEntry[];
  otherOpenHeardScenarioIds: string[];
  packageContext?: DirectorPackageContext;
  progression?: {
    turnsWithoutAdvancement: number;
    repeatedNonAnswerTurns: number;
    recommendedAngle?: InvestigativeRecoveryAngle;
  };
  suggestedActionKinds: DirectorActionKind[];
}

export interface GMDirectorBriefInput {
  session: AdventureSession;
  phase: "opening" | "action" | "roll-resolution";
  playerAction?: string;
  adventurePackage?: PromptAdventurePackage;
  maxChars?: number;
}

export const MAX_OTHER_SCENARIO_IDS = 6;
// Keep historical lookups on prompt generation bounded. Older scenario events
// still rank by their authored timestamps; package reveal state is summarised
// in packageProgress when available.
export const DIRECTOR_HISTORY_LOOKBACK_TURNS = 256;

import type {
  ActionResolutionTrace,
  AdventureSession,
  DirectorDeliveryTrace,
  EvaluationTurn,
  GenerationResetReason,
  GenerationThreadMode,
  TurnProgressKind,
  ResolvedSourceExcerpt,
  RubricScores,
} from "@codex/adventure-engine";
import type { AdventureTurnGenerationService } from "@codex/ai-engine";
import type { AdventureGroundingService } from "./adventure-grounding-service";

export interface AdventureEvaluationStep {
  playerAction: string;
  phase?: "opening" | "action" | "roll-resolution";
  anchors?: ResolvedSourceExcerpt[];
  relevant?: ResolvedSourceExcerpt[];
  canaries?: string[];
  gmOnlyLore?: string[];
  expectsSubstantiveAnswer?: boolean;
  expectsActionableProgression?: boolean;
  expectsUsefulNegativeFinding?: boolean;
  quietOutcome?: "peaceful" | "exhausted";
  forbiddenNpcKnowledge?: string[];
  /** Simulates reloading local committed state with an empty provider thread. */
  providerHistoryReset?: boolean;
  /** Explicitly retry the same action once after a provider generation error. */
  retryOnGenerationFailure?: boolean;
}

export interface AdventureEvaluationCase {
  id: string;
  session: AdventureSession;
  playerAction: string;
  playerCharacterName: string;
  canaries: string[];
  phase?: "opening" | "action" | "roll-resolution";
  anchors?: ResolvedSourceExcerpt[];
  relevant?: ResolvedSourceExcerpt[];
  gmOnlyLore?: string[];
  turns?: AdventureEvaluationStep[];
}

export interface AdventureEvaluationTelemetry {
  modelCalls: number;
  retrievalHydrations: number;
  serializedStateChars: number;
  generationInputChars: number;
  durationMs: number;
  expansionCount: number;
  providerUsage: "unavailable";
  estimatedPrice: "unavailable";
  turns: AdventureEvaluationTurnTelemetry[];
}

export type AdventureEvaluationResetClassification =
  GenerationResetReason | "none" | "scripted" | "reconstructed" | "unknown";

export interface AdventureEvaluationTurnTelemetry {
  turn: number;
  modelKey: string;
  requestedEffort: "low" | "medium" | "high" | "xhigh" | "unspecified";
  actualEffort: "low" | "medium" | "high" | "xhigh" | "unknown";
  contextMode: "retained" | "reconstructed" | "unspecified";
  transport: "interaction" | "stateless" | "unknown";
  threadMode: GenerationThreadMode | "unknown";
  resetClassification: AdventureEvaluationResetClassification;
  generationAttempts: number;
  committed: boolean;
  progressKind?: TurnProgressKind;
  directorDelivery?: DirectorDeliveryTrace;
  actionResolution?: ActionResolutionTrace;
  repeatedSuggestedActions?: boolean;
  expectedSignals: {
    substantiveAnswer?: boolean;
    actionableProgression?: boolean;
    usefulNegativeFinding?: boolean;
    quietOutcome?: boolean;
  };
  npcKnowledgeViolations: number;
  rubrics?: RubricScores;
  rubricFailures?: string[];
  canonFailures?: string[];
  consequenceFailures?: string[];
}

export interface AdventureEvaluationCaseResult extends RubricScores {
  id: string;
  passed: boolean;
  telemetry: AdventureEvaluationTelemetry;
  progression: {
    meaningfulAdvancement: number;
    committedTurns: number;
    substantiveAnswers: number;
    actionableProgression: number;
    usefulNegativeFindings: number;
    causalStateChanges: number;
    committedFactReuse: number;
    causalConsistencyChecks: number;
    causalConsistencyFailures: number;
    npcKnowledgeChecks: number;
    npcKnowledgeViolations: number;
    validQuietOutcomes: number;
    repeatedNonAnswers: number;
    agencyPreserved: number;
    expectedSignalsMet: number;
    expectedSignalsFailed: number;
    retryAttempts: number;
  };
  executionFailures: Array<{ turn: number; kind: "generation" | "commit" }>;
}

export interface AdventureEvaluationCondition {
  modelName: string;
  reasoningEffort: "low" | "medium";
  directorEnabled: boolean;
  contextMode: "retained" | "reconstructed";
}

export const ADVENTURE_EVALUATION_CONDITIONS: AdventureEvaluationCondition[] = (
  ["low", "medium"] as const
).flatMap((reasoningEffort) =>
  ([false, true] as const).flatMap((directorEnabled) =>
    (["retained", "reconstructed"] as const).map((contextMode) => ({
      modelName: "luna-fast",
      reasoningEffort,
      directorEnabled,
      contextMode,
    })),
  ),
);

export interface AdventureEvaluationConditionResult {
  condition: AdventureEvaluationCondition;
  results: AdventureEvaluationResult[];
}

export interface AdventureEvaluationResult extends RubricScores {
  provider: string;
  cases: AdventureEvaluationCaseResult[];
  passed: boolean;
  telemetry: AdventureEvaluationTelemetry;
}

export interface AdventureEvaluationRunnerOptions {
  /** QA treatment only; production generation remains Director-on. */
  directorEnabled?: boolean;
  reasoningEffort?: "low" | "medium" | "high" | "xhigh";
  contextMode?: "retained" | "reconstructed";
  grounding?: Pick<AdventureGroundingService, "prepare">;
  now?: () => number;
  getRetrievalHydrations?: () => number;
  commitNow?: () => string;
}

export type EvaluationGenerationService = Pick<
  AdventureTurnGenerationService,
  "generate"
> &
  Partial<
    Pick<
      AdventureTurnGenerationService,
      "confirmInteraction" | "clearInteraction"
    >
  >;

export interface CaseExecutionState {
  currentSession: AdventureSession;
  evaluatedTurns: EvaluationTurn[];
  modelCalls: number;
  retrievalHydrations: number;
  serializedStateChars: number;
  generationInputChars: number;
  turnTelemetry: AdventureEvaluationTurnTelemetry[];
  executionFailures: Array<{ turn: number; kind: "generation" | "commit" }>;
  retryAttempts: number;
  executedTurns: Array<{
    turn: number;
    step: AdventureEvaluationStep;
    evaluation: EvaluationTurn;
    committed: boolean;
    progressKind?: TurnProgressKind;
  }>;
}

export type ProgressionSummary = AdventureEvaluationCaseResult["progression"];

export type EvaluationProposal = Awaited<
  ReturnType<AdventureTurnGenerationService["generate"]>
>;

export interface PreparedEvaluationStep {
  previousSession: AdventureSession;
  step: AdventureEvaluationStep;
  index: number;
  contextMode: AdventureEvaluationRunnerOptions["contextMode"];
  request: Parameters<AdventureTurnGenerationService["generate"]>[0];
  generationOptions: Parameters<AdventureTurnGenerationService["generate"]>[1];
  anchors: ResolvedSourceExcerpt[];
  relevant: ResolvedSourceExcerpt[];
  clearInteraction: () => void;
}

export interface GeneratedEvaluationProposal {
  proposal?: EvaluationProposal;
  attemptsMade: number;
}

export function createCaseExecutionState(
  session: AdventureSession,
): CaseExecutionState {
  return {
    currentSession: session,
    evaluatedTurns: [],
    modelCalls: 0,
    retrievalHydrations: 0,
    serializedStateChars: 0,
    generationInputChars: 0,
    turnTelemetry: [],
    executionFailures: [],
    retryAttempts: 0,
    executedTurns: [],
  };
}

export interface EvaluationCommit {
  session: AdventureSession;
  failed: boolean;
  committed: boolean;
}

export interface EvaluationExecutionDependencies {
  generation: EvaluationGenerationService;
  options: AdventureEvaluationRunnerOptions;
  now: () => number;
  commitNow: () => string;
}

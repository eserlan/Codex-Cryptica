import { AdventureEvaluationRunner } from "../apps/web/src/lib/services/adventure/adventure-evaluation-runner";
import type { AdventureEvaluationCondition } from "../apps/web/src/lib/services/adventure/adventure-evaluation-runner";
import type { AdventureTurnGenerationService } from "../packages/ai-engine/src/adventure-turn-generation.service";
import type { PreparedCorpusCase } from "./adventure-evaluation-corpus-fixtures";
import {
  buildCorpusCaseReport,
  capturePlayerFacingOutputs,
  type CapturedPlayerOutput,
  type CorpusCallMetrics,
  type CorpusCaseReport,
} from "./adventure-evaluation-corpus-report";

type GenerationService = Pick<AdventureTurnGenerationService, "generate"> &
  Partial<
    Pick<
      AdventureTurnGenerationService,
      "confirmInteraction" | "clearInteraction"
    >
  >;

export async function evaluatePreparedCorpusCase(
  generation: GenerationService,
  prepared: PreparedCorpusCase,
  condition: AdventureEvaluationCondition,
  metrics: () => CorpusCallMetrics,
): Promise<CorpusCaseReport> {
  const outputs: CapturedPlayerOutput[] = [];
  const capturedGeneration = capturePlayerFacingOutputs(
    generation,
    prepared.steps,
    outputs,
  );
  const runner = new AdventureEvaluationRunner(
    capturedGeneration,
    [condition.modelName],
    {
      directorEnabled: condition.directorEnabled,
      reasoningEffort: condition.reasoningEffort,
      contextMode: condition.contextMode,
    },
  );
  const [conditionResult] = await runner.runConditionMatrix(
    [prepared.testCase],
    [condition],
  );
  const caseResult = conditionResult?.results[0]?.cases[0];
  if (!caseResult) {
    throw new Error("Evaluation condition returned no corpus case result.");
  }
  return buildCorpusCaseReport(
    prepared,
    condition,
    caseResult,
    outputs,
    metrics(),
  );
}

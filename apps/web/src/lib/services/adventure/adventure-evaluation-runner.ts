import {
  parseAdventureSession,
  type AdventureTurnProposal,
} from "@codex/adventure-engine";
import {
  ADVENTURE_EVALUATION_CONDITIONS,
  type AdventureEvaluationCase,
  type AdventureEvaluationCaseResult,
  type AdventureEvaluationCondition,
  type AdventureEvaluationConditionResult,
  type AdventureEvaluationResult,
  type AdventureEvaluationRunnerOptions,
  type EvaluationExecutionDependencies,
  type EvaluationGenerationService,
} from "./adventure-evaluation-model";
import {
  aggregateCaseResults,
  runEvaluationCase,
} from "./adventure-evaluation-case";

export { ADVENTURE_EVALUATION_CONDITIONS } from "./adventure-evaluation-model";
export type {
  AdventureEvaluationStep,
  AdventureEvaluationCase,
  AdventureEvaluationTelemetry,
  AdventureEvaluationResetClassification,
  AdventureEvaluationTurnTelemetry,
  AdventureEvaluationCaseResult,
  AdventureEvaluationCondition,
  AdventureEvaluationConditionResult,
  AdventureEvaluationResult,
  AdventureEvaluationRunnerOptions,
} from "./adventure-evaluation-model";

function isolateCaseForCondition(
  testCase: AdventureEvaluationCase,
  condition: AdventureEvaluationCondition,
): AdventureEvaluationCase {
  const isolatedCase = structuredClone(testCase);
  return {
    ...isolatedCase,
    session: parseAdventureSession({
      ...isolatedCase.session,
      // Each transport arm owns an isolated provider thread.
      id: `${testCase.session.id}-eval-${condition.reasoningEffort}-${condition.directorEnabled ? "director" : "control"}-${condition.contextMode}`,
    }),
  };
}

export class AdventureEvaluationRunner {
  constructor(
    private readonly generation: EvaluationGenerationService,
    private readonly providers: string[] = ["default"],
    private readonly options: AdventureEvaluationRunnerOptions = {},
  ) {}

  async run(
    cases: AdventureEvaluationCase[],
  ): Promise<AdventureEvaluationResult[]> {
    const now = this.options.now ?? (() => Date.now());
    const commitNow =
      this.options.commitNow ?? (() => new Date(now()).toISOString());
    const dependencies = {
      generation: this.generation,
      options: this.options,
      now,
      commitNow,
    };
    const runProvider = (provider: string) =>
      this.runProvider(cases, provider, dependencies);
    if (this.options.getRetrievalHydrations) {
      const results: AdventureEvaluationResult[] = [];
      for (const provider of this.providers) {
        results.push(await runProvider(provider));
      }
      return results;
    }
    return Promise.all(this.providers.map(runProvider));
  }

  async runConditionMatrix(
    cases: AdventureEvaluationCase[],
    conditions: AdventureEvaluationCondition[] = ADVENTURE_EVALUATION_CONDITIONS,
  ): Promise<AdventureEvaluationConditionResult[]> {
    const results: AdventureEvaluationConditionResult[] = [];
    for (const condition of conditions) {
      const isolatedCases = cases.map((testCase) =>
        isolateCaseForCondition(testCase, condition),
      );
      const runner = new AdventureEvaluationRunner(
        this.generation,
        [condition.modelName],
        {
          ...this.options,
          directorEnabled: condition.directorEnabled,
          reasoningEffort: condition.reasoningEffort,
          contextMode: condition.contextMode,
        },
      );
      results.push({ condition, results: await runner.run(isolatedCases) });
    }
    return results;
  }

  private async runProvider(
    cases: AdventureEvaluationCase[],
    provider: string,
    dependencies: EvaluationExecutionDependencies,
  ): Promise<AdventureEvaluationResult> {
    const results: AdventureEvaluationCaseResult[] = [];
    for (const testCase of cases) {
      results.push(await runEvaluationCase(testCase, provider, dependencies));
    }
    return aggregateCaseResults(provider, results);
  }
}

export const adventureEvaluationRunner = new AdventureEvaluationRunner({
  async generate(): Promise<AdventureTurnProposal> {
    throw new Error(
      "Configure an AdventureTurnGenerationService before running evaluations.",
    );
  },
});

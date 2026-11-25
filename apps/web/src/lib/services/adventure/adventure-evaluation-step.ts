import type {
  AdventureEvaluationCase,
  AdventureEvaluationStep,
  CaseExecutionState,
  EvaluationCommit,
  EvaluationExecutionDependencies,
  EvaluationGenerationService,
  EvaluationProposal,
  GeneratedEvaluationProposal,
  PreparedEvaluationStep,
} from "./adventure-evaluation-model";
import { prepareEvaluationStep } from "./adventure-evaluation-context";
import { evaluationProgressKind } from "./adventure-evaluation-signals";
import { commitEvaluationTurn } from "./adventure-evaluation-turn";
import {
  buildFailedTurnTelemetry,
  buildGeneratedTurnTelemetry,
} from "./adventure-evaluation-telemetry";

export async function runEvaluationStep(
  testCase: AdventureEvaluationCase,
  provider: string,
  step: AdventureEvaluationStep,
  index: number,
  state: CaseExecutionState,
  dependencies: EvaluationExecutionDependencies,
): Promise<void> {
  const prepared = await prepareEvaluationStep(
    testCase,
    provider,
    step,
    index,
    state,
    dependencies,
  );
  const generated = await generateEvaluationProposal(
    prepared,
    state,
    dependencies.generation,
  );
  if (!generated.proposal) {
    state.executionFailures.push({
      turn: prepared.index + 1,
      kind: "generation",
    });
    state.turnTelemetry.push(
      buildFailedTurnTelemetry(
        prepared,
        generated.attemptsMade,
        dependencies.options,
      ),
    );
    return;
  }
  recordGeneratedEvaluation(testCase, prepared, generated, state, dependencies);
}

async function generateEvaluationProposal(
  prepared: PreparedEvaluationStep,
  state: CaseExecutionState,
  generation: EvaluationGenerationService,
): Promise<GeneratedEvaluationProposal> {
  const maxAttempts = prepared.step.retryOnGenerationFailure ? 2 : 1;
  let proposal: EvaluationProposal | undefined;
  let attemptsMade = 0;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) {
      state.retryAttempts += 1;
      prepared.clearInteraction();
    }
    state.modelCalls += 1;
    attemptsMade += 1;
    try {
      proposal = await generation.generate(
        prepared.request,
        prepared.generationOptions,
      );
      break;
    } catch {
      prepared.clearInteraction();
    }
  }
  return { proposal, attemptsMade };
}

function recordGeneratedEvaluation(
  testCase: AdventureEvaluationCase,
  prepared: PreparedEvaluationStep,
  generated: GeneratedEvaluationProposal,
  state: CaseExecutionState,
  dependencies: EvaluationExecutionDependencies,
): void {
  const proposal = generated.proposal;
  if (!proposal) return;
  const { step, index } = prepared;
  const { commit, evaluation } = commitEvaluationTurn(
    testCase,
    prepared,
    proposal,
    dependencies.commitNow,
  );
  const progressKind = evaluationProgressKind(evaluation, commit.committed);
  state.evaluatedTurns.push(evaluation);
  state.executedTurns.push({
    turn: index + 1,
    step,
    evaluation,
    committed: commit.committed,
    progressKind,
  });
  state.currentSession = commit.session;
  state.turnTelemetry.push(
    buildGeneratedTurnTelemetry(
      {
        prepared,
        attemptsMade: generated.attemptsMade,
        proposal,
        evaluation,
        commit,
        progressKind,
      },
      dependencies.options,
    ),
  );
  finalizeGeneratedInteraction(
    prepared,
    commit,
    proposal,
    state,
    dependencies.generation,
  );
}

function finalizeGeneratedInteraction(
  prepared: PreparedEvaluationStep,
  commit: EvaluationCommit,
  proposal: EvaluationProposal,
  state: CaseExecutionState,
  generation: EvaluationGenerationService,
): void {
  const { previousSession, index, clearInteraction } = prepared;
  if (commit.failed) {
    state.executionFailures.push({ turn: index + 1, kind: "commit" });
    clearInteraction();
    return;
  }
  if (
    commit.committed &&
    proposal.generationInfo?.transport === "interaction"
  ) {
    generation.confirmInteraction?.(
      previousSession.id,
      commit.session.revision,
    );
    return;
  }
  // Roll-required, stateless and unknown transports are not promoted into
  // a retained provider thread by this benchmark.
  clearInteraction();
}

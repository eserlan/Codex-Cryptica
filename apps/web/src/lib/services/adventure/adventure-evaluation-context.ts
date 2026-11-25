import {
  buildAdventurePrompt,
  type AdventureSession,
  type ResolvedSourceExcerpt,
} from "@codex/adventure-engine";
import type {
  AdventureEvaluationCase,
  AdventureEvaluationStep,
  AdventureEvaluationRunnerOptions,
  CaseExecutionState,
  PreparedEvaluationStep,
  EvaluationExecutionDependencies,
} from "./adventure-evaluation-model";

export async function prepareEvaluationStep(
  testCase: AdventureEvaluationCase,
  provider: string,
  step: AdventureEvaluationStep,
  index: number,
  state: CaseExecutionState,
  {
    generation,
    options,
  }: Pick<EvaluationExecutionDependencies, "generation" | "options">,
): Promise<PreparedEvaluationStep> {
  const previousSession = state.currentSession;
  const phase = step.phase ?? "action";
  const context = await resolveStepContext(
    previousSession,
    phase,
    step,
    testCase,
    options,
  );
  state.retrievalHydrations += context.hydrations;
  recordPromptSizes(previousSession, step, phase, context, state, options);
  const request: PreparedEvaluationStep["request"] = {
    session: previousSession,
    phase,
    playerAction: step.playerAction,
    anchors: context.anchors,
    relevant: context.relevant,
    ...(options.directorEnabled === undefined
      ? {}
      : { directorEnabled: options.directorEnabled }),
    ...(options.contextMode === undefined
      ? {}
      : { contextMode: options.contextMode }),
  };
  const clearInteraction = () =>
    generation.clearInteraction?.(previousSession.id);
  if (options.contextMode === "reconstructed" || step.providerHistoryReset) {
    clearInteraction();
  }
  return {
    previousSession,
    step,
    index,
    contextMode: options.contextMode,
    request,
    generationOptions: {
      modelName: provider,
      ...(options.reasoningEffort
        ? { reasoningEffort: options.reasoningEffort }
        : {}),
    },
    anchors: context.anchors,
    relevant: context.relevant,
    clearInteraction,
  };
}

function recordPromptSizes(
  session: AdventureSession,
  step: AdventureEvaluationStep,
  phase: "opening" | "action" | "roll-resolution",
  context: {
    anchors: ResolvedSourceExcerpt[];
    relevant: ResolvedSourceExcerpt[];
  },
  state: CaseExecutionState,
  options: AdventureEvaluationRunnerOptions,
): void {
  const prompt = buildAdventurePrompt({
    session,
    phase,
    playerAction: step.playerAction,
    anchors: context.anchors,
    relevant: context.relevant,
    ...(options.directorEnabled === undefined
      ? {}
      : { directorEnabled: options.directorEnabled }),
  });
  state.serializedStateChars = Math.max(
    state.serializedStateChars,
    JSON.stringify(prompt.state).length,
  );
  state.generationInputChars = Math.max(
    state.generationInputChars,
    JSON.stringify(prompt).length,
  );
}

async function resolveStepContext(
  session: AdventureSession,
  phase: "opening" | "action" | "roll-resolution",
  step: AdventureEvaluationStep,
  testCase: AdventureEvaluationCase,
  options: AdventureEvaluationRunnerOptions,
): Promise<{
  anchors: ResolvedSourceExcerpt[];
  relevant: ResolvedSourceExcerpt[];
  hydrations: number;
}> {
  const supplied = suppliedContext(step, testCase);
  if (supplied) return supplied;
  if (!options.grounding) {
    return { anchors: [], relevant: [], hydrations: 0 };
  }
  const before = options.getRetrievalHydrations?.() ?? 0;
  const prepared = await options.grounding.prepare({
    purpose: groundingPurpose(phase),
    session,
    playerAction: step.playerAction,
  });
  const after = options.getRetrievalHydrations?.();
  return {
    anchors: prepared.anchors,
    relevant: prepared.relevant,
    hydrations:
      after !== undefined
        ? Math.max(0, after - before)
        : prepared.anchors.length + prepared.relevant.length,
  };
}

export function evaluationSteps(
  testCase: AdventureEvaluationCase,
): AdventureEvaluationStep[] {
  if (testCase.turns?.length) {
    return testCase.turns.map((step) => ({
      ...step,
      phase: step.phase ?? testCase.phase,
    }));
  }
  return [
    {
      playerAction: testCase.playerAction,
      phase: testCase.phase ?? "action",
      anchors: testCase.anchors,
      relevant: testCase.relevant,
      canaries: testCase.canaries,
      gmOnlyLore: testCase.gmOnlyLore,
    },
  ];
}

function suppliedContext(
  step: AdventureEvaluationStep,
  testCase: AdventureEvaluationCase,
):
  | {
      anchors: ResolvedSourceExcerpt[];
      relevant: ResolvedSourceExcerpt[];
      hydrations: number;
    }
  | undefined {
  if (
    !step.anchors &&
    !step.relevant &&
    !testCase.anchors &&
    !testCase.relevant
  )
    return undefined;
  return {
    anchors: step.anchors ?? testCase.anchors ?? [],
    relevant: step.relevant ?? testCase.relevant ?? [],
    hydrations: 0,
  };
}

function groundingPurpose(
  phase: "opening" | "action" | "roll-resolution",
): "opening" | "action" | "roll-resolution" {
  if (phase === "opening") return "opening";
  if (phase === "roll-resolution") return "roll-resolution";
  return "action";
}

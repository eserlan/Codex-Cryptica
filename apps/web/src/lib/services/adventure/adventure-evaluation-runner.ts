import {
  aggregateScores,
  applyCompletedTurn,
  buildAdventurePrompt,
  buildAdventureRecap,
  createPlayerTranscript,
  evaluateAdventureRun,
  type AdventureSession,
  type AdventureTurnProposal,
  type EvaluationTurn,
  type ResolvedSourceExcerpt,
  type RubricScores,
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
}

export interface AdventureEvaluationCaseResult extends RubricScores {
  id: string;
  passed: boolean;
  telemetry: AdventureEvaluationTelemetry;
}

export interface AdventureEvaluationResult extends RubricScores {
  provider: string;
  cases: AdventureEvaluationCaseResult[];
  passed: boolean;
  telemetry: AdventureEvaluationTelemetry;
}

export interface AdventureEvaluationRunnerOptions {
  grounding?: Pick<AdventureGroundingService, "prepare">;
  now?: () => number;
  getRetrievalHydrations?: () => number;
  commitNow?: () => string;
}

function countExpansions(session: AdventureSession): number {
  return (
    (session.places?.length ?? 0) +
    (session.scenarioCollection?.items.length ?? 0) +
    (session.worldTime?.events.length ?? 0)
  );
}

function emptyTelemetry(): AdventureEvaluationTelemetry {
  return {
    modelCalls: 0,
    retrievalHydrations: 0,
    serializedStateChars: 0,
    generationInputChars: 0,
    durationMs: 0,
    expansionCount: 0,
  };
}

export class AdventureEvaluationRunner {
  constructor(
    private readonly generation: Pick<
      AdventureTurnGenerationService,
      "generate"
    >,
    private readonly providers: string[] = ["default"],
    private readonly options: AdventureEvaluationRunnerOptions = {},
  ) {}

  async run(
    cases: AdventureEvaluationCase[],
  ): Promise<AdventureEvaluationResult[]> {
    const now = this.options.now ?? (() => Date.now());
    const commitNow =
      this.options.commitNow ?? (() => new Date(now()).toISOString());

    return Promise.all(
      this.providers.map(async (provider) => {
        const results: AdventureEvaluationCaseResult[] = [];
        for (const testCase of cases) {
          results.push(
            await this.runCase(testCase, provider, now, commitNow),
          );
        }

        const telemetry = results.reduce<AdventureEvaluationTelemetry>(
          (acc, item) => ({
            modelCalls: acc.modelCalls + item.telemetry.modelCalls,
            retrievalHydrations:
              acc.retrievalHydrations + item.telemetry.retrievalHydrations,
            serializedStateChars: Math.max(
              acc.serializedStateChars,
              item.telemetry.serializedStateChars,
            ),
            generationInputChars: Math.max(
              acc.generationInputChars,
              item.telemetry.generationInputChars,
            ),
            durationMs: acc.durationMs + item.telemetry.durationMs,
            expansionCount: acc.expansionCount + item.telemetry.expansionCount,
          }),
          emptyTelemetry(),
        );

        const agency = aggregateScores(results.map((r) => r.agency));
        const secrecy = aggregateScores(results.map((r) => r.secrecy));
        const continuity = aggregateScores(results.map((r) => r.continuity));
        const canonSafety = aggregateScores(results.map((r) => r.canonSafety));
        const consequenceCredibility = aggregateScores(
          results.map((r) => r.consequenceCredibility),
        );
        const unnecessaryEscalation = aggregateScores(
          results.map((r) => r.unnecessaryEscalation),
        );

        return {
          provider,
          cases: results,
          agency,
          secrecy,
          continuity,
          canonSafety,
          consequenceCredibility,
          unnecessaryEscalation,
          passed: results.every((r) => r.passed),
          telemetry,
        };
      }),
    );
  }

  private async runCase(
    testCase: AdventureEvaluationCase,
    provider: string,
    now: () => number,
    commitNow: () => string,
  ): Promise<AdventureEvaluationCaseResult> {
    const startedAt = now();
    const initialExpansions = countExpansions(testCase.session);
    const steps: AdventureEvaluationStep[] = testCase.turns?.length
      ? testCase.turns
      : [
          {
            playerAction: testCase.playerAction,
            phase: testCase.phase ?? "action",
            anchors: testCase.anchors,
            relevant: testCase.relevant,
            canaries: testCase.canaries,
            gmOnlyLore: testCase.gmOnlyLore,
          },
        ];

    let currentSession = testCase.session;
    const evaluatedTurns: EvaluationTurn[] = [];
    let modelCalls = 0;
    let retrievalHydrations = 0;
    let serializedStateChars = 0;
    let generationInputChars = 0;

    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index]!;
      const phase = step.phase ?? "action";
      const { anchors, relevant, hydrations } = await this.resolveStepContext(
        currentSession,
        phase,
        step,
        testCase,
      );
      retrievalHydrations += hydrations;

      const prompt = buildAdventurePrompt({
        session: currentSession,
        phase,
        playerAction: step.playerAction,
        anchors,
        relevant,
      });
      serializedStateChars = Math.max(
        serializedStateChars,
        JSON.stringify(prompt.state).length,
      );
      generationInputChars = Math.max(
        generationInputChars,
        JSON.stringify(prompt).length,
      );

      modelCalls += 1;
      const proposal = await this.generation.generate(
        {
          session: currentSession,
          phase,
          playerAction: step.playerAction,
          anchors,
          relevant,
        },
        { modelName: provider },
      );

      let nextSession = currentSession;
      if (proposal.kind === "complete") {
        const committed = applyCompletedTurn(currentSession, proposal, {
          turnId: `${testCase.id}-turn-${index + 1}`,
          inputId: `${testCase.id}-input-${index + 1}`,
          now: commitNow(),
          playerAction: step.playerAction,
        });
        if (committed.ok) nextSession = committed.value;
      }

      evaluatedTurns.push({
        narration:
          proposal.kind === "complete"
            ? proposal.narration
            : (proposal.setupNarration ?? ""),
        playerCharacterName: testCase.playerCharacterName,
        playerAction: step.playerAction,
        proposal,
        previousSession: currentSession,
        session: nextSession,
        canaries: step.canaries ?? testCase.canaries,
        gmOnlyLore: [
          ...(testCase.gmOnlyLore ?? []),
          ...(step.gmOnlyLore ?? []),
          ...anchors.flatMap((a) => (a.lore ? [a.lore] : [])),
          ...relevant.flatMap((r) => (r.lore ? [r.lore] : [])),
        ],
        recap: buildAdventureRecap(nextSession),
        transcript: createPlayerTranscript(nextSession),
      });
      currentSession = nextSession;
    }

    const runScore = evaluateAdventureRun(evaluatedTurns, testCase.canaries);
    const expansionCount = Math.max(
      0,
      countExpansions(currentSession) - initialExpansions,
    );

    return {
      id: testCase.id,
      ...runScore.scores,
      passed: runScore.passed,
      telemetry: {
        modelCalls,
        retrievalHydrations,
        serializedStateChars,
        generationInputChars,
        durationMs: Math.max(0, now() - startedAt),
        expansionCount,
      },
    };
  }

  private async resolveStepContext(
    session: AdventureSession,
    phase: "opening" | "action" | "roll-resolution",
    step: AdventureEvaluationStep,
    testCase: AdventureEvaluationCase,
  ): Promise<{
    anchors: ResolvedSourceExcerpt[];
    relevant: ResolvedSourceExcerpt[];
    hydrations: number;
  }> {
    if (step.anchors || step.relevant || testCase.anchors || testCase.relevant) {
      return {
        anchors: step.anchors ?? testCase.anchors ?? [],
        relevant: step.relevant ?? testCase.relevant ?? [],
        hydrations: 0,
      };
    }
    if (!this.options.grounding) {
      return { anchors: [], relevant: [], hydrations: 0 };
    }
    const before = this.options.getRetrievalHydrations?.() ?? 0;
    const prepared = await this.options.grounding.prepare({
      purpose:
        phase === "opening"
          ? "opening"
          : phase === "roll-resolution"
            ? "roll-resolution"
            : "action",
      session,
      playerAction: step.playerAction,
    });
    const after = this.options.getRetrievalHydrations?.();
    return {
      anchors: prepared.anchors,
      relevant: prepared.relevant,
      hydrations:
        after !== undefined
          ? Math.max(0, after - before)
          : prepared.anchors.length + prepared.relevant.length,
    };
  }
}

export const adventureEvaluationRunner = new AdventureEvaluationRunner({
  async generate(): Promise<AdventureTurnProposal> {
    throw new Error(
      "Configure an AdventureTurnGenerationService before running evaluations.",
    );
  },
});

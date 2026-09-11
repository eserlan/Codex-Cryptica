import {
  aggregateScores,
  scorePlayerAgency,
  scoreSecrecy,
  type AdventureTurnProposal,
} from "@codex/adventure-engine";
import type { AdventureTurnGenerationService } from "@codex/ai-engine";

export interface AdventureEvaluationCase {
  id: string;
  session: any;
  playerAction: string;
  playerCharacterName: string;
  canaries: string[];
}

export interface AdventureEvaluationResult {
  provider: string;
  cases: Array<{ id: string; agency: number; secrecy: number }>;
  agency: number;
  secrecy: number;
}

export class AdventureEvaluationRunner {
  constructor(
    private readonly generation: Pick<
      AdventureTurnGenerationService,
      "generate"
    >,
    private readonly providers: string[] = ["default"],
  ) {}

  async run(
    cases: AdventureEvaluationCase[],
  ): Promise<AdventureEvaluationResult[]> {
    return Promise.all(
      this.providers.map(async (provider) => {
        const results = [];
        for (const testCase of cases) {
          const proposal = await this.generation.generate(
            {
              session: testCase.session,
              phase: "action",
              playerAction: testCase.playerAction,
              anchors: [],
              relevant: [],
            },
            { modelName: provider },
          );
          const scored = {
            narration:
              proposal.kind === "complete"
                ? proposal.narration
                : (proposal.setupNarration ?? ""),
            playerCharacterName: testCase.playerCharacterName,
            proposal,
          };
          results.push({
            id: testCase.id,
            agency: scorePlayerAgency(scored),
            secrecy: scoreSecrecy(scored, testCase.canaries),
          });
        }
        return {
          provider,
          cases: results,
          agency: aggregateScores(results.map((result) => result.agency)),
          secrecy: aggregateScores(results.map((result) => result.secrecy)),
        };
      }),
    );
  }
}

export const adventureEvaluationRunner = new AdventureEvaluationRunner({
  async generate(): Promise<AdventureTurnProposal> {
    throw new Error(
      "Configure an AdventureTurnGenerationService before running evaluations.",
    );
  },
});

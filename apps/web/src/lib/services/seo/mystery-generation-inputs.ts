import {
  buildMysteryPrompt,
  extractMysteryNames,
  type MysteryGeneratorOptions,
} from "generator-engine/public-mystery";
import type { PublicGeneratorOutput } from "generator-engine/public-generator-types";
import {
  formatRecentInputsNote,
  generationInputHistoryStore,
  generationNameHistoryStore,
  summarizeResolvedInputs,
} from "./generation-input-history.js";

export function prepareMysteryGeneration(options: MysteryGeneratorOptions) {
  const recentInputs = generationInputHistoryStore.recent(
    "mystery-investigation",
  );
  const recentNames = generationNameHistoryStore.recent(
    "mystery-investigation",
  );
  const avoidNames = [
    ...new Set([...(options.avoidNames ?? []), ...recentNames]),
  ];
  const prompt = buildMysteryPrompt(
    { ...options, avoidNames },
    formatRecentInputsNote(recentInputs),
  );
  generationInputHistoryStore.record(
    "mystery-investigation",
    summarizeResolvedInputs(prompt.resolved),
  );
  return {
    prompt,
    recordLocalOutput(output: PublicGeneratorOutput) {
      generationNameHistoryStore.record(
        "mystery-investigation",
        extractMysteryNames(output),
      );
    },
  };
}

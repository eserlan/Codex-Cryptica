import { generationInputHistoryStore } from "./generation-input-history";
import type { PublicGeneratorOutput } from "generator-engine/public-generator-types";

export function tomeVariationOptions<T extends Record<string, unknown>>(
  options: T,
): T & {
  avoidDeceptionKeys: string[];
  avoidDeceptions: string[];
  recentInputs: string[];
} {
  const recentInputs = generationInputHistoryStore.recent("tome");
  const avoidDeceptionKeys = recentInputs.flatMap((entry) => {
    const match = entry.match(/deceptionKey: ([^,|]+)/);
    return match ? [match[1].trim()] : [];
  });
  return {
    ...options,
    avoidDeceptionKeys,
    avoidDeceptions: generationInputHistoryStore.recent("tome-mysteries"),
    recentInputs,
  };
}

export function recordTomeHistory(
  output: PublicGeneratorOutput,
  inputSummary: string,
  selectedDeceptionKey?: string,
): void {
  generationInputHistoryStore.record(
    "tome",
    selectedDeceptionKey
      ? `${inputSummary}, deceptionKey: ${selectedDeceptionKey}`
      : inputSummary,
  );
  generationInputHistoryStore.record(
    "tome-mysteries",
    output.tomeFacts?.deception,
  );
}

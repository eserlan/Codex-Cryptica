import type { AIGeneratorGateway } from "generator-engine";
import type { StatBlockReaderGateway } from "@codex/stat-sheet-engine";
import { aiGeneratorGateway } from "$lib/services/generators/ai-generator-gateway";

/**
 * Adapts the app's AI gateway to the reader. Always a one-shot request: no
 * interaction is passed, so nothing is kept server-side (FR-021).
 */
export function createStatBlockReaderGateway(
  base: AIGeneratorGateway = aiGeneratorGateway,
): StatBlockReaderGateway {
  return {
    async complete(prompt, systemInstruction, options) {
      const result = await base.complete(prompt, systemInstruction, {
        generationConfig: options.generationConfig,
        signal: options.signal,
      });
      return typeof result === "string" ? result : result.text;
    },
  };
}

export const statBlockReaderGateway: StatBlockReaderGateway =
  createStatBlockReaderGateway();

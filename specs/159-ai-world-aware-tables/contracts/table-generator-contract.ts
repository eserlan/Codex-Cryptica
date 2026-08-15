/**
 * Table Generator Contract Interface
 *
 * Defines the public interfaces and service boundaries for world-grounded
 * random table generation.
 */

import type {
  RandomTableGenerationContext,
  CandidateTableEntry,
  GeneratedTableOutput,
} from "../data-model";

/**
 * Low-level prompt builder and response parser contract in generator-engine.
 */
export interface TablePromptBuilder {
  /** Builds the LLM prompt payload including system instructions, pinned entities, and sub-table list. */
  buildPrompt(context: RandomTableGenerationContext): {
    systemInstruction: string;
    userPrompt: string;
    temperature: number;
  };

  /** Parses the raw LLM response text into structured table entries. */
  parseResponse(responseText: string): GeneratedTableOutput;

  /** Generates a local mock/fallback table without network calls. */
  generateLocal(context: RandomTableGenerationContext): GeneratedTableOutput;
}

/**
 * High-level orchestration service in apps/web.
 */
export interface TableGenerationServiceContract {
  /**
   * Generates candidate table entries grounded in the active vault's lore and available tables.
   */
  generateTableEntries(
    context: RandomTableGenerationContext,
  ): Promise<CandidateTableEntry[]>;
}

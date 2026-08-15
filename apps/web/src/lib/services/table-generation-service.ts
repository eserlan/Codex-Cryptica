/**
 * Table Generation Service
 *
 * Orchestrates vault entity grounding, sub-table reference discovery,
 * and AI generation for world-aware random roll tables (#2250).
 */

import {
  buildRandomTablePrompt,
  generateRandomTableLocal,
  parseRandomTableResponse,
  type AIPolicy,
  type CandidateTableEntry,
  type GeneratedTableOutput,
  type RandomTableGenerationContext,
} from "generator-engine";
import { aiGeneratorGateway } from "./generators/ai-generator-gateway";
import { searchService as defaultSearchService } from "@codex/search-orchestrator";
import { randomSources as defaultRandomSources } from "$lib/features/random/index";
import { systemIdGenerator, type IdGenerator } from "$lib/utils/runtime-deps";

export interface TableGenerationServiceDeps {
  searchService?: {
    search: (query: string, options?: any) => Promise<any>;
  };
  aiGateway?: {
    complete: (
      prompt: string,
      systemInstruction: string,
      options?: any,
    ) => Promise<any>;
  };
  sourcesStore?: {
    sources?: Array<{ name: string }>;
    tables?: Array<{ name: string }>;
    decks?: Array<{ name: string }>;
    all?: Array<{ name: string }>;
  };
  aiPolicy?: AIPolicy;
  idGenerator?: IdGenerator;
}

export interface GeneratedCandidateTableResult {
  title: string;
  description?: string;
  candidates: CandidateTableEntry[];
  isFallback: boolean;
}

export class TableGenerationService {
  private readonly searchService?: {
    search: (query: string, options?: any) => Promise<any>;
  };
  private readonly aiGateway: {
    complete: (
      prompt: string,
      systemInstruction: string,
      options?: any,
    ) => Promise<any>;
  };
  private readonly sourcesStore?: TableGenerationServiceDeps["sourcesStore"];
  private readonly aiPolicy?: AIPolicy;
  private readonly idGenerator: IdGenerator;

  constructor(deps: TableGenerationServiceDeps = {}) {
    this.searchService = deps.searchService ?? defaultSearchService;
    this.aiGateway = deps.aiGateway ?? aiGeneratorGateway;
    this.sourcesStore = deps.sourcesStore ?? (defaultRandomSources as any);
    this.aiPolicy = deps.aiPolicy;
    this.idGenerator = deps.idGenerator ?? systemIdGenerator;
  }

  /**
   * Generates candidate table entries grounded in the vault's lore and available tables.
   */
  async generateTableEntries(
    context: RandomTableGenerationContext,
  ): Promise<GeneratedCandidateTableResult> {
    const isAiDisabled =
      this.aiPolicy && (!this.aiPolicy.isEnabled || !this.aiPolicy.isAvailable);

    // If AI is disabled or offline, produce local fallback
    if (isAiDisabled) {
      const fallback = generateRandomTableLocal(context);
      return this.mapToResult(fallback, context, true);
    }

    try {
      // 1. Retrieve top vault entities for grounding via search
      let worldEntities: RandomTableGenerationContext["worldEntities"] =
        context.worldEntities;

      if (!worldEntities && this.searchService) {
        const searchQuery =
          `${context.topic} ${context.campaignContext ?? ""}`.trim();
        if (searchQuery.length > 0) {
          const searchRes = await this.searchService.search(searchQuery, {
            limit: 12,
          });
          const results = searchRes?.results ?? [];
          worldEntities = results
            .map((r: any) => {
              const item = r.item ?? r;
              return {
                title: item.title ?? "",
                category: item.category ?? item.entityType,
                summary: item.summary ?? item.snippet,
              };
            })
            .filter((e: { title: string }) => e.title.length > 0);
        }
      }

      // 2. Discover available sub-tables and decks
      let availableTables = context.availableTables;
      if (!availableTables && this.sourcesStore) {
        const allSources = this.sourcesStore.sources ??
          this.sourcesStore.all ?? [
            ...(this.sourcesStore.tables ?? []),
            ...(this.sourcesStore.decks ?? []),
          ];
        availableTables = allSources.map((s: { name: string }) => s.name);
      }

      // 3. Assemble prompt
      const prompt = buildRandomTablePrompt({
        ...context,
        worldEntities,
        availableTables,
      });

      // 4. Complete via AI gateway
      const response = await this.aiGateway.complete(
        prompt.userPrompt,
        prompt.systemInstruction,
        {
          generationConfig: {
            temperature: prompt.temperature,
          },
        },
      );

      const rawText =
        typeof response === "string" ? response : (response?.text ?? "");
      const parsed = parseRandomTableResponse(rawText);

      return this.mapToResult(parsed, context, false);
    } catch {
      // On network/LLM failure, fallback to local generation
      const fallback = generateRandomTableLocal(context);
      return this.mapToResult(fallback, context, true);
    }
  }

  private mapToResult(
    output: GeneratedTableOutput,
    context: RandomTableGenerationContext,
    isFallback: boolean,
  ): GeneratedCandidateTableResult {
    const candidates: CandidateTableEntry[] = output.entries.map((entry) => {
      const id = this.idGenerator.uuid();
      const matchedSubTables: string[] = [];
      const subTableRegex = /\{([^}]+)\}/g;
      let match: RegExpExecArray | null;
      while ((match = subTableRegex.exec(entry.text))) {
        matchedSubTables.push(match[1].trim());
      }

      const matchedEntities: string[] = [];
      if (context.worldEntities) {
        for (const entity of context.worldEntities) {
          if (
            entity.title &&
            entry.text.toLowerCase().includes(entity.title.toLowerCase())
          ) {
            matchedEntities.push(entity.title);
          }
        }
      }

      return {
        id,
        text: entry.text,
        weight: entry.weight ?? 1,
        matchedSubTables:
          matchedSubTables.length > 0 ? matchedSubTables : undefined,
        matchedEntities:
          matchedEntities.length > 0 ? matchedEntities : undefined,
        selected: true,
      };
    });

    return {
      title: output.title || context.topic,
      description: output.description,
      candidates,
      isFallback,
    };
  }
}

export const tableGenerationService = new TableGenerationService();

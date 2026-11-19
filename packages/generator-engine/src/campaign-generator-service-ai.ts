import { CampaignGeneratorLanguageService } from "./campaign-generator-service-language";
import type { AIRouteContext } from "./campaign-ai-route-context";
import { generateDungeonWithAI } from "./campaign-dungeon-generation";
import {
  generateGenericWithAI,
  withNameSuggestion,
} from "./campaign-generic-generation";
import { generateLocalDraft } from "./campaign-local-generation";
import {
  generateAdventureWithAI,
  generateHeistWithAI,
  generatePointCrawlWithAI,
  generateTomeWithAI,
  generateVillainWithAI,
} from "./campaign-staged-generation";
import { getGenerator } from "./campaign-generator-registry";
import { generateBusinessWithAI } from "./campaign-business-generation";
import { generateCouncilVoteWithAI } from "./campaign-council-vote-generation";
import { generateCampaignMysteryWithAI } from "./campaign-mystery-generation";
import { getThemeDefaults } from "./campaign-generator-theme";
import type {
  CampaignGeneratorDefinition,
  GeneratedDraft,
  GeneratorRunRequest,
} from "./campaign-generator-types";

type AIRoute = (
  ctx: AIRouteContext,
  generator: CampaignGeneratorDefinition,
  request: GeneratorRunRequest,
  bannedNames: Set<string>,
  signal?: AbortSignal,
) => Promise<GeneratedDraft | null>;

/** Generators with their own route; anything else uses the generic one. */
const AI_ROUTES = new Map<string, AIRoute>([
  [
    "mystery-investigation",
    (ctx, generator, request, bannedNames, signal) =>
      generateCampaignMysteryWithAI(
        ctx.gateway,
        generator,
        request,
        bannedNames,
        signal,
      ),
  ],
  ["tome", generateTomeWithAI],
  [
    "heist",
    (ctx, generator, request, _bannedNames, signal) =>
      generateHeistWithAI(ctx, generator, request, signal),
  ],
  ["villain", generateVillainWithAI],
  [
    "dungeon",
    (ctx, generator, request) => generateDungeonWithAI(ctx, generator, request),
  ],
  ["adventure", generateAdventureWithAI],
  [
    "council-vote",
    (ctx, generator, request, _bannedNames, signal) =>
      generateCouncilVoteWithAI(ctx.gateway, generator, request, { signal }),
  ],
  [
    "business",
    (ctx, generator, request, _bannedNames, signal) =>
      generateBusinessWithAI(ctx.gateway, generator, request, { signal }),
  ],
  [
    "point-crawl",
    (ctx, generator, request, _bannedNames, signal) =>
      generatePointCrawlWithAI(ctx, generator, request, signal),
  ],
]);

export class CampaignGeneratorAIGenerationService extends CampaignGeneratorLanguageService {
  /**
   * Runs the fast name-only pre-pass and returns the request to build the main
   * prompt from. Unchanged when there is no gateway or no name is wanted.
   */
  protected async withNameSuggestion(
    request: GeneratorRunRequest,
  ): Promise<GeneratorRunRequest> {
    if (!this.aiGateway) return request;
    return withNameSuggestion(this.aiGateway, request);
  }

  /** Sends the request to the route for its generator, or the generic route. */
  protected async generateAIDraft(
    generator: ReturnType<typeof getGenerator>,
    request: GeneratorRunRequest,
    bannedNames: Set<string>,
    signal?: AbortSignal,
  ): Promise<GeneratedDraft | null> {
    const gateway = this.aiGateway;
    if (!gateway) return null;
    const ctx: AIRouteContext = {
      gateway,
      deps: this._deps,
      onInteractionResult: this.onInteractionResult,
      onPromptMetrics: this.onPromptMetrics,
    };

    if (request.generatorId === "language") {
      return this.generateLanguageWithAI(generator, request, bannedNames);
    }
    const route = AI_ROUTES.get(request.generatorId) ?? generateGenericWithAI;
    return route(ctx, generator, request, bannedNames, signal);
  }

  protected async generateAIDraftIfAvailable(
    generator: ReturnType<typeof getGenerator>,
    request: GeneratorRunRequest,
    bannedNames: Set<string>,
    signal?: AbortSignal,
  ): Promise<GeneratedDraft | null> {
    const canUseAI =
      request.useAI &&
      this.aiPolicy.isEnabled &&
      this.aiPolicy.isAvailable &&
      !!this.aiGateway;
    request.useAI = canUseAI;
    return canUseAI
      ? this.generateAIDraft(generator, request, bannedNames, signal)
      : null;
  }

  protected generateLocalDraft(
    generator: ReturnType<typeof getGenerator>,
    request: GeneratorRunRequest,
    bannedNames: Set<string>,
  ): GeneratedDraft {
    return generateLocalDraft(generator, request, bannedNames);
  }

  /**
   * Produce a transient draft. When `useAI` is true and both AI policy and
   * gateway are available, calls the AI gateway and parses JSON output.
   * Falls back to local table generation on any AI failure.
   * Throws {@link UnsupportedGeneratorError} for unknown generator ids.
   * Does not write to the vault.
   */
  async generateDraft(
    request: GeneratorRunRequest,
    signal?: AbortSignal,
  ): Promise<GeneratedDraft> {
    const generator = getGenerator(request.generatorId);
    const themeDefaults = getThemeDefaults(
      request.themeId,
      request.generatorId,
    );
    const mergedRequest: GeneratorRunRequest = {
      ...request,
      options: { ...themeDefaults, ...request.options },
    };

    const bannedNames = new Set([
      ...(mergedRequest.vaultContext?.bannedNames ?? []),
      ...(mergedRequest.vaultContext?.existingTitles ?? []),
    ]);

    const aiDraft = await this.generateAIDraftIfAvailable(
      generator,
      mergedRequest,
      bannedNames,
      signal,
    );
    signal?.throwIfAborted();
    return (
      aiDraft ?? this.generateLocalDraft(generator, mergedRequest, bannedNames)
    );
  }
}

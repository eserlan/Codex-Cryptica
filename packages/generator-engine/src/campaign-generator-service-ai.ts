import { CampaignGeneratorLanguageService } from "./campaign-generator-service-language";
import { parseGenericGeneratorOutput } from "./campaign-generator-output-parsing";
import {
  CampaignGeneratorCore,
  completeText,
  promptMetrics,
  buildGenericGeneratorPrompt,
  withGeneratorRequest,
  normalizeDungeonOutput,
  MAX_AI_ATTEMPTS,
} from "./campaign-generator-service-core";
import {
  buildCampaignDungeonPrompt,
  buildCampaignTomePrompt,
  getGenerator,
  isTitleBanned,
  pointCrawlOptions,
  SYSTEM_INSTRUCTION,
} from "./campaign-generator-registry";
import { generatePointCrawlStaged } from "./point-crawl-staged";
import { pointCrawlToOutput } from "./public-point-crawl";
import { suggestName } from "./name-candidates";
import {
  buildDungeonCoherencePrompt,
  buildDungeonRetryMessage,
  parseDungeonResponseDetailed,
} from "./public-dungeon";
import { generateDungeonStaged } from "./dungeon-staged";
import { generateTomeTwoPass } from "./public-tome";
import { generateCampaignHeist } from "./campaign-heist-generation";
import { generateCouncilVoteWithAI } from "./campaign-council-vote-generation";
import {
  assertValidLanguageFallback,
  LanguageGenerationError,
} from "./campaign-generator-language";
import { getThemeDefaults } from "./campaign-generator-theme";
import type {
  AIGeneratorCompleteResult,
  AIGeneratorGateway,
  CampaignGeneratorDefinition,
  GeneratedDraft,
  GeneratorOutput,
  GeneratorRunRequest,
} from "./campaign-generator-types";

function getAcceptedDungeonInteraction(
  result: Awaited<ReturnType<NonNullable<AIGeneratorGateway>["complete"]>>,
): AIGeneratorCompleteResult | undefined {
  return typeof result !== "string" && result.usedInteraction
    ? result
    : undefined;
}

type DungeonCompletionMetadata = {
  replayed: boolean;
  usedInteraction: boolean;
};

function getDungeonCompletionMetadata(
  result: Awaited<ReturnType<NonNullable<AIGeneratorGateway>["complete"]>>,
): DungeonCompletionMetadata {
  return typeof result === "string"
    ? { replayed: false, usedInteraction: false }
    : {
        replayed: !!result.replayed,
        usedInteraction: !!result.usedInteraction,
      };
}

function getDungeonSentPrompt(
  fullPrompt: string,
  interaction: GeneratorRunRequest["interaction"],
  replayed: boolean,
): string {
  if (replayed) return interaction?.replayPrompt ?? fullPrompt;
  return interaction?.input ?? fullPrompt;
}

function getDungeonPromptMetrics(
  request: GeneratorRunRequest,
  fullPrompt: string,
  interaction: GeneratorRunRequest["interaction"],
  metadata: DungeonCompletionMetadata,
) {
  return promptMetrics({
    request,
    fullPrompt,
    sentPrompt: getDungeonSentPrompt(
      fullPrompt,
      interaction,
      metadata.replayed,
    ),
    usedInteraction: metadata.usedInteraction,
    replayed: metadata.replayed,
  });
}

export class CampaignGeneratorAIGenerationService extends CampaignGeneratorLanguageService {
  protected async generateDungeonWithAI(
    generator: CampaignGeneratorDefinition,
    request: GeneratorRunRequest,
  ): Promise<GeneratedDraft | null> {
    if (!this.aiGateway) return null;
    const prompt = buildCampaignDungeonPrompt(request);
    // `options.staged === false` forces the one-pass route (baseline, tests).
    // A continuity thread stays on the one-pass route: staged calls cannot
    // carry it, so they would drop the thread and its follow-ups.
    const staged =
      request.options?.staged === false || request.interaction
        ? null
        : await this.generateDungeonStaged(generator, request, prompt);
    if (staged) return staged;
    const interaction = this.buildDungeonInteraction(
      request,
      prompt.userMessage,
    );

    try {
      const result = await this.aiGateway.complete(
        prompt.userMessage,
        prompt.systemInstruction,
        { interaction },
      );
      const first = parseDungeonResponseDetailed(
        completeText(result),
        prompt.options,
        undefined,
        prompt.resolved,
      );
      const resolved = await this.resolveDungeonResponse(prompt, first, result);
      this.reportDungeonGeneration(
        request,
        prompt.userMessage,
        interaction,
        result,
        resolved.interaction,
      );
      return generator.mapOutputToDraft(
        normalizeDungeonOutput(resolved.output),
        request,
      );
    } catch {
      return null;
    }
  }

  /**
   * Staged route (foundation, sectors, factions, coherence). Resolves `null`
   * when a stage is unusable so the one-pass route can run; staged calls do
   * not use the interaction thread or report prompt metrics.
   */
  private async generateDungeonStaged(
    generator: CampaignGeneratorDefinition,
    request: GeneratorRunRequest,
    prompt: ReturnType<typeof buildCampaignDungeonPrompt>,
  ): Promise<GeneratedDraft | null> {
    try {
      const result = await generateDungeonStaged(
        prompt.resolved,
        prompt.options,
        {
          contextPrefix: prompt.contextPrefix,
          onStats: this._deps.onDungeonStagedStats,
          complete: async (instruction, message) =>
            completeText(await this.aiGateway!.complete(message, instruction)),
        },
      );
      return result
        ? generator.mapOutputToDraft(
            normalizeDungeonOutput(result.output),
            request,
          )
        : null;
    } catch {
      return null;
    }
  }

  private buildDungeonInteraction(
    request: GeneratorRunRequest,
    prompt: string,
  ): GeneratorRunRequest["interaction"] {
    return request.interaction
      ? {
          ...request.interaction,
          input: withGeneratorRequest(request.interaction.input, prompt),
          replayPrompt: request.interaction.replayPrompt ?? prompt,
        }
      : undefined;
  }

  private async resolveDungeonResponse(
    prompt: ReturnType<typeof buildCampaignDungeonPrompt>,
    first: ReturnType<typeof parseDungeonResponseDetailed>,
    result: Awaited<
      ReturnType<
        NonNullable<
          CampaignGeneratorAIGenerationService["aiGateway"]
        >["complete"]
      >
    >,
  ): Promise<{
    output: ReturnType<typeof parseDungeonResponseDetailed>["output"];
    interaction?: AIGeneratorCompleteResult;
  }> {
    const initialInteraction = getAcceptedDungeonInteraction(result);
    if (first.rejected) {
      return this.resolveRejectedDungeon(prompt, first, initialInteraction);
    }
    if (first.structured) {
      return this.resolveCoherentDungeon(prompt, first, initialInteraction);
    }
    return { output: first.output, interaction: initialInteraction };
  }

  private async resolveRejectedDungeon(
    prompt: ReturnType<typeof buildCampaignDungeonPrompt>,
    first: ReturnType<typeof parseDungeonResponseDetailed>,
    initialInteraction?: AIGeneratorCompleteResult,
  ) {
    const retried = await this.retryRejectedDungeon(prompt, first);
    return {
      output: retried?.output ?? first.output,
      interaction: retried ? undefined : initialInteraction,
    };
  }

  private async resolveCoherentDungeon(
    prompt: ReturnType<typeof buildCampaignDungeonPrompt>,
    first: ReturnType<typeof parseDungeonResponseDetailed>,
    initialInteraction?: AIGeneratorCompleteResult,
  ) {
    const repaired = await this.repairDungeonCoherence(prompt, first);
    const accepted = repaired && !repaired.rejected;
    return {
      output: accepted ? repaired.output : first.output,
      interaction: accepted ? undefined : initialInteraction,
    };
  }

  private async retryRejectedDungeon(
    prompt: ReturnType<typeof buildCampaignDungeonPrompt>,
    first: ReturnType<typeof parseDungeonResponseDetailed>,
  ) {
    const retry = await this.aiGateway!.complete(
      buildDungeonRetryMessage(prompt.userMessage, first.problems),
      prompt.systemInstruction,
    );
    const second = parseDungeonResponseDetailed(
      completeText(retry),
      prompt.options,
      undefined,
      prompt.resolved,
    );
    return second.problems.length === 0 || !second.rejected ? second : null;
  }

  private async repairDungeonCoherence(
    prompt: ReturnType<typeof buildCampaignDungeonPrompt>,
    first: ReturnType<typeof parseDungeonResponseDetailed>,
  ) {
    const coherence = buildDungeonCoherencePrompt(
      first.structured!,
      prompt.resolved,
    );
    const repair = await this.aiGateway!.complete(
      coherence.userMessage,
      coherence.systemInstruction,
    );
    return parseDungeonResponseDetailed(
      completeText(repair),
      prompt.options,
      undefined,
      prompt.resolved,
    );
  }

  private reportDungeonGeneration(
    request: GeneratorRunRequest,
    fullPrompt: string,
    interaction: GeneratorRunRequest["interaction"],
    result: Awaited<
      ReturnType<
        NonNullable<
          CampaignGeneratorAIGenerationService["aiGateway"]
        >["complete"]
      >
    >,
    acceptedInteraction?: AIGeneratorCompleteResult,
  ): void {
    if (acceptedInteraction) this.onInteractionResult?.(acceptedInteraction);
    const metadata = getDungeonCompletionMetadata(result);
    this.onPromptMetrics?.(
      getDungeonPromptMetrics(request, fullPrompt, interaction, metadata),
    );
  }

  /**
   * Runs the fast name-only pre-pass (see `name-candidates.ts`) and returns the
   * request to build the main prompt from. Falls back to the request unchanged
   * whenever no name is wanted or the pre-pass fails.
   */
  protected async withNameSuggestion(
    request: GeneratorRunRequest,
  ): Promise<GeneratorRunRequest> {
    if (!this.aiGateway) return request;
    const nameSuggestion = await suggestName(this.aiGateway, request);
    return nameSuggestion ? { ...request, nameSuggestion } : request;
  }

  protected async generateTomeWithAI(
    generator: ReturnType<typeof getGenerator>,
    request: GeneratorRunRequest,
    bannedNames: Set<string>,
    signal?: AbortSignal,
  ): Promise<GeneratedDraft | null> {
    const gateway = this.aiGateway;
    if (!gateway) return null;
    try {
      const prompt = buildCampaignTomePrompt(request);
      const reviewed = await generateTomeTwoPass(
        prompt,
        async (instruction, message, passSignal) =>
          completeText(
            await gateway.complete(message, instruction, {
              signal: passSignal,
            }),
          ),
        signal,
      );
      if (!reviewed || isTitleBanned(reviewed.title, bannedNames)) return null;

      this.onPromptMetrics?.(
        promptMetrics({
          request,
          fullPrompt: prompt.userMessage,
          sentPrompt: prompt.userMessage,
          usedInteraction: false,
          replayed: false,
        }),
      );
      return generator.mapOutputToDraft(
        { ...reviewed, summary: reviewed.summary ?? "" },
        request,
      );
    } catch {
      // An invalid first or second pass falls back to local generation.
      return null;
    }
  }

  // fallow-ignore-next-line complexity
  protected async generateAIDraft(
    generator: ReturnType<typeof getGenerator>,
    request: GeneratorRunRequest,
    bannedNames: Set<string>,
    signal?: AbortSignal,
  ): Promise<GeneratedDraft | null> {
    const gateway = this.aiGateway;
    if (!gateway) return null;

    switch (request.generatorId) {
      case "tome":
        return this.generateTomeWithAI(generator, request, bannedNames, signal);
      case "heist":
        try {
          const output = await generateCampaignHeist(request, gateway);
          return generator.mapOutputToDraft(
            { ...output, summary: output.summary ?? "" },
            request,
          );
        } catch {
          return null;
        }
      case "dungeon":
        return this.generateDungeonWithAI(generator, request);
      case "language":
        return this.generateLanguageWithAI(generator, request, bannedNames);
      case "council-vote":
        return generateCouncilVoteWithAI(gateway, generator, request);
      case "point-crawl":
        try {
          const network = await generatePointCrawlStaged(
            pointCrawlOptions(request),
            async (prompt) =>
              completeText(
                await gateway.complete(prompt, SYSTEM_INSTRUCTION, { signal }),
              ),
            undefined,
            signal,
          );
          const output = pointCrawlToOutput(network);
          return generator.mapOutputToDraft(
            {
              title: output.title,
              summary: output.summary ?? "",
              content: output.content,
              lore: output.lore,
              labels: output.labels,
              pointCrawl: output.pointCrawl,
            },
            request,
          );
        } catch {
          return null;
        }
      default:
        return this.generateGenericWithAI(generator, request, bannedNames);
    }
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
    let output: GeneratorOutput;
    try {
      output = generator.generate(request);
    } catch (error) {
      if (request.generatorId === "language") {
        throw new LanguageGenerationError(
          "The local language generator could not produce a valid profile. Please try again.",
        );
      }
      throw error;
    }
    if (request.generatorId === "language") {
      assertValidLanguageFallback(output, bannedNames);
      return generator.mapOutputToDraft(output, request);
    }
    for (
      let attempt = 0;
      attempt < 5 && isTitleBanned(output.title, bannedNames);
      attempt++
    ) {
      output = generator.generate(request);
    }
    return generator.mapOutputToDraft(output, request);
  }

  protected async generateGenericWithAI(
    generator: ReturnType<typeof getGenerator>,
    request: GeneratorRunRequest,
    bannedNames: Set<string>,
  ): Promise<GeneratedDraft | null> {
    const gateway = this.aiGateway;
    if (!gateway) return null;
    const { fullPrompt, interaction } = buildGenericGeneratorPrompt(
      generator,
      await this.withNameSuggestion(request),
    );
    return this.retryGenericAttempts(
      gateway,
      generator,
      request,
      bannedNames,
      fullPrompt,
      interaction,
    );
  }

  protected async retryGenericAttempts(
    gateway: NonNullable<CampaignGeneratorCore["aiGateway"]>,
    generator: ReturnType<typeof getGenerator>,
    request: GeneratorRunRequest,
    bannedNames: Set<string>,
    fullPrompt: string,
    interaction: ReturnType<typeof buildGenericGeneratorPrompt>["interaction"],
  ): Promise<GeneratedDraft | null> {
    for (let attempt = 0; attempt < MAX_AI_ATTEMPTS; attempt++) {
      const result = await this.runGenericAttempt(
        gateway,
        generator,
        request,
        bannedNames,
        fullPrompt,
        interaction,
      );
      if (result.kind === "draft") return result.draft;
      if (result.kind === "stop") return null;
    }
    return null;
  }

  protected async runGenericAttempt(
    gateway: NonNullable<CampaignGeneratorCore["aiGateway"]>,
    generator: ReturnType<typeof getGenerator>,
    request: GeneratorRunRequest,
    bannedNames: Set<string>,
    fullPrompt: string,
    interaction: ReturnType<typeof buildGenericGeneratorPrompt>["interaction"],
  ): Promise<
    | { kind: "draft"; draft: GeneratedDraft }
    | { kind: "retry" }
    | { kind: "stop" }
  > {
    try {
      const result = await gateway.complete(fullPrompt, SYSTEM_INSTRUCTION, {
        interaction,
      });
      const output = parseGenericGeneratorOutput(
        completeText(result),
        request.generatorId,
      );
      if (!output) return { kind: "stop" };
      if (isTitleBanned(output.title, bannedNames)) return { kind: "retry" };
      this.recordGenericMetrics(result, request, fullPrompt, interaction);
      return {
        kind: "draft",
        draft: generator.mapOutputToDraft(output, request),
      };
    } catch {
      return { kind: "stop" };
    }
  }

  protected recordGenericMetrics(
    result: Awaited<
      ReturnType<NonNullable<CampaignGeneratorCore["aiGateway"]>["complete"]>
    >,
    request: GeneratorRunRequest,
    fullPrompt: string,
    interaction: ReturnType<typeof buildGenericGeneratorPrompt>["interaction"],
  ): void {
    const interactionResult = this.getGenericInteractionResult(result);
    if (interactionResult) this.onInteractionResult?.(interactionResult);
    this.onPromptMetrics?.(
      promptMetrics({
        request,
        fullPrompt,
        sentPrompt: this.getGenericSentPrompt(result, fullPrompt, interaction),
        usedInteraction: !!interactionResult,
        replayed: this.isGenericReplay(result),
      }),
    );
  }

  protected getGenericInteractionResult(
    result: Awaited<
      ReturnType<NonNullable<CampaignGeneratorCore["aiGateway"]>["complete"]>
    >,
  ) {
    if (typeof result === "string" || !result.usedInteraction) return undefined;
    return result;
  }

  protected isGenericReplay(
    result: Awaited<
      ReturnType<NonNullable<CampaignGeneratorCore["aiGateway"]>["complete"]>
    >,
  ): boolean {
    return typeof result !== "string" && !!result.replayed;
  }

  protected getGenericSentPrompt(
    result: Awaited<
      ReturnType<NonNullable<CampaignGeneratorCore["aiGateway"]>["complete"]>
    >,
    fullPrompt: string,
    interaction: ReturnType<typeof buildGenericGeneratorPrompt>["interaction"],
  ): string {
    return this.isGenericReplay(result)
      ? (interaction?.replayPrompt ?? fullPrompt)
      : (interaction?.input ?? fullPrompt);
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

import {
  canStreamTomeWithAI,
  canStreamGenericWithAI,
  mergeGeneratorRequest,
  captureGenericStreamCompletion,
  type GenericStreamAttemptResult,
  type GenericStreamResolution,
  mapReviewedTomeDraft,
  startStreamedTomeReview,
  buildGenericGeneratorPrompt,
  promptMetrics,
  MAX_AI_ATTEMPTS,
} from "./campaign-generator-service-core";
import { parseGenericGeneratorOutput } from "./campaign-generator-output-parsing";
import { CampaignGeneratorAIGenerationService } from "./campaign-generator-service-ai";
import {
  getGenerator,
  buildCampaignTomePrompt,
  isTitleBanned,
  SYSTEM_INSTRUCTION,
} from "./campaign-generator-registry";
import { generateTomeTwoPass } from "./public-tome";
import type { TomePrompt } from "./public-tome";
import { streamCampaignHeist } from "./campaign-heist-generation";
import { generateCouncilVoteWithAIStream } from "./campaign-council-vote-generation";
import type {
  AIGeneratorGateway,
  GeneratedDraft,
  GenerationEvent,
  GeneratorRunRequest,
} from "./campaign-generator-types";

export class CampaignGeneratorStreamingService extends CampaignGeneratorAIGenerationService {
  /**
   * Streaming counterpart to `generateDraft` (#2423), for the *generic*
   * single-call generator branch only (excluding dungeon, language, and tome,
   * which use multi-pass repair loops, plus council-vote's chat session).
   * Yields `GenerationEvent`s
   * (`started`/`delta`/`field`/`complete`/`error`) as they arrive so the UI
   * can render progressively, then exactly one final `{ type: "draft" }`
   * event carrying the fully validated `GeneratedDraft` — mirroring
   * `generateDraft`'s exact validation/retry/local-fallback behavior, just
   * reached incrementally instead of after one full await. Falls back to
   * calling `generateDraft` itself (yielding only `started` then `draft`)
   * whenever streaming isn't actually available or applicable, so a caller
   * can always use this method uniformly rather than branching on generator
   * type or gateway capability itself.
   */
  private async *generateTomeDraftStream(
    request: GeneratorRunRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<
    GenerationEvent | { type: "draft"; draft: GeneratedDraft }
  > {
    if (signal?.aborted) return;
    yield { type: "started" };
    const mergedRequest = mergeGeneratorRequest(request, "tome");
    const gateway = this.aiGateway;
    if (!canStreamTomeWithAI(request, this.aiPolicy, gateway)) {
      let draft: GeneratedDraft;
      try {
        draft = await this.generateDraft(mergedRequest, signal);
      } catch (error) {
        if (signal?.aborted) return;
        throw error;
      }
      if (!signal?.aborted) yield { type: "draft", draft };
      return;
    }

    yield* this.streamReviewedTomeDraft(mergedRequest, gateway, signal);
  }

  private async *streamReviewedTomeDraft(
    request: GeneratorRunRequest,
    gateway: AIGeneratorGateway,
    signal?: AbortSignal,
  ): AsyncGenerator<
    GenerationEvent | { type: "draft"; draft: GeneratedDraft }
  > {
    const generator = getGenerator("tome");
    const bannedNames = new Set([
      ...(request.vaultContext?.bannedNames ?? []),
      ...(request.vaultContext?.existingTitles ?? []),
    ]);
    const reviewStream = this.streamTomeReview(
      buildCampaignTomePrompt(request),
      gateway,
      signal,
    );
    let reviewed: Awaited<ReturnType<typeof generateTomeTwoPass>>;
    for (;;) {
      const next = await reviewStream.next();
      if (next.done) {
        reviewed = next.value;
        break;
      }
      yield next.value;
    }
    if (signal?.aborted) return;
    const draft = mapReviewedTomeDraft(
      reviewed,
      generator,
      request,
      bannedNames,
      () => this.generateLocalDraft(generator, request, bannedNames),
    );
    yield { type: "draft", draft };
  }

  private async *streamTomeReview(
    prompt: TomePrompt,
    gateway: AIGeneratorGateway,
    signal?: AbortSignal,
  ): AsyncGenerator<
    GenerationEvent,
    Awaited<ReturnType<typeof generateTomeTwoPass>>
  > {
    const events: GenerationEvent[] = [];
    let wake: (() => void) | undefined;
    let finished = false;
    const enqueue = (event: GenerationEvent) => {
      events.push(event);
      wake?.();
      wake = undefined;
    };

    // Run both calls in one background promise *within this request*. The
    // queue exposes the second pass's stream without revealing the first.
    const task = startStreamedTomeReview(prompt, gateway, signal, enqueue)
      .catch(() => null)
      .finally(() => {
        finished = true;
        wake?.();
        wake = undefined;
      });

    while (!finished || events.length > 0) {
      if (signal?.aborted) return null;
      const event = events.shift();
      if (event) yield event;
      else await new Promise<void>((resolve) => (wake = resolve));
    }
    await task;
    return task;
  }

  private async *generateHeistDraftStream(
    request: GeneratorRunRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<
    GenerationEvent | { type: "draft"; draft: GeneratedDraft }
  > {
    if (signal?.aborted) return;
    yield { type: "started" };
    const mergedRequest = mergeGeneratorRequest(request, "heist");
    const generator = getGenerator("heist");
    if (this.canGenerateHeistWithAI(request)) {
      try {
        yield* this.streamHeistAIOutput(mergedRequest, generator, signal);
        return;
      } catch {
        if (signal?.aborted) return;
      }
    }
    if (!signal?.aborted) {
      yield {
        type: "draft",
        draft: await this.generateDraft({ ...mergedRequest, useAI: false }),
      };
    }
  }

  private canGenerateHeistWithAI(request: GeneratorRunRequest): boolean {
    return Boolean(
      request.useAI &&
      this.aiPolicy.isEnabled &&
      this.aiPolicy.isAvailable &&
      this.aiGateway,
    );
  }

  private async *streamHeistAIOutput(
    request: GeneratorRunRequest,
    generator: ReturnType<typeof getGenerator>,
    signal?: AbortSignal,
  ): AsyncGenerator<
    GenerationEvent | { type: "draft"; draft: GeneratedDraft }
  > {
    const output = yield* streamCampaignHeist(request, this.aiGateway!, signal);
    if (signal?.aborted) return;
    yield {
      type: "draft",
      draft: generator.mapOutputToDraft(
        { ...output, summary: output.summary ?? "" },
        request,
      ),
    };
  }

  private async *generateCouncilVoteDraftStream(
    request: GeneratorRunRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<
    GenerationEvent | { type: "draft"; draft: GeneratedDraft }
  > {
    yield* generateCouncilVoteWithAIStream(
      request,
      {
        aiPolicy: this.aiPolicy,
        aiGateway: this.aiGateway,
        generateDraft: (currentRequest) => this.generateDraft(currentRequest),
      },
      signal,
    );
  }

  private async *generateGenericDraftStream(
    request: GeneratorRunRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<
    GenerationEvent | { type: "draft"; draft: GeneratedDraft }
  > {
    const gateway = this.aiGateway;
    if (!canStreamGenericWithAI(request, this.aiPolicy, gateway)) {
      yield* this.generateGenericDraftFallback(request, signal);
      return;
    }

    const generator = getGenerator(request.generatorId);
    const mergedRequest = mergeGeneratorRequest(request);
    mergedRequest.useAI = true;

    const bannedNames = new Set([
      ...(mergedRequest.vaultContext?.bannedNames ?? []),
      ...(mergedRequest.vaultContext?.existingTitles ?? []),
    ]);
    const promptRequest = await this.withNameSuggestion(mergedRequest);
    if (signal?.aborted) return;
    const { fullPrompt, interaction } = buildGenericGeneratorPrompt(
      generator,
      promptRequest,
    );
    yield* this.streamGenericGeneratorAttempts(
      request,
      mergedRequest,
      generator,
      bannedNames,
      fullPrompt,
      interaction,
      gateway,
      signal,
    );
  }

  private async *generateGenericDraftFallback(
    request: GeneratorRunRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<
    GenerationEvent | { type: "draft"; draft: GeneratedDraft }
  > {
    yield { type: "started" };
    let draft: GeneratedDraft;
    try {
      draft = await this.generateDraft(request, signal);
    } catch (error) {
      if (signal?.aborted) return;
      throw error;
    }
    if (!signal?.aborted) yield { type: "draft", draft };
  }

  private async *streamGenericGeneratorAttempts(
    request: GeneratorRunRequest,
    mergedRequest: GeneratorRunRequest,
    generator: ReturnType<typeof getGenerator>,
    bannedNames: Set<string>,
    fullPrompt: string,
    interaction: ReturnType<typeof buildGenericGeneratorPrompt>["interaction"],
    gateway: AIGeneratorGateway,
    signal?: AbortSignal,
  ): AsyncGenerator<
    GenerationEvent | { type: "draft"; draft: GeneratedDraft }
  > {
    for (let attempt = 0; attempt < MAX_AI_ATTEMPTS; attempt++) {
      const result = yield* this.streamGenericGeneratorAttempt(
        fullPrompt,
        interaction,
        gateway,
        signal,
      );
      if (result.cancelled) return;
      const resolution = this.resolveGenericStreamAttempt(
        result,
        mergedRequest,
        generator,
        bannedNames,
        fullPrompt,
        interaction,
      );
      if (resolution.type === "retry") continue;
      if (resolution.type === "draft") {
        yield { type: "draft", draft: resolution.draft };
        return;
      }
      break;
    }
    yield { type: "draft", draft: await this.generateDraft(request) };
  }

  private resolveGenericStreamAttempt(
    result: GenericStreamAttemptResult,
    mergedRequest: GeneratorRunRequest,
    generator: ReturnType<typeof getGenerator>,
    bannedNames: Set<string>,
    fullPrompt: string,
    interaction: ReturnType<typeof buildGenericGeneratorPrompt>["interaction"],
  ): GenericStreamResolution {
    if (result.failed) return { type: "fallback" };
    const output = parseGenericGeneratorOutput(
      result.raw,
      mergedRequest.generatorId,
    );
    if (!output) return { type: "fallback" };
    if (isTitleBanned(output.title, bannedNames)) return { type: "retry" };
    this.reportGenericStreamAttempt(
      result,
      mergedRequest,
      fullPrompt,
      interaction,
    );
    return {
      type: "draft",
      draft: generator.mapOutputToDraft(output, mergedRequest),
    };
  }

  private reportGenericStreamAttempt(
    result: GenericStreamAttemptResult,
    request: GeneratorRunRequest,
    fullPrompt: string,
    interaction: ReturnType<typeof buildGenericGeneratorPrompt>["interaction"],
  ): void {
    this.reportGenericInteraction(result, interaction);
    this.onPromptMetrics?.(
      promptMetrics({
        request,
        fullPrompt,
        sentPrompt: result.replayed
          ? (interaction?.replayPrompt ?? fullPrompt)
          : (interaction?.input ?? fullPrompt),
        usedInteraction: !!interaction,
        replayed: result.replayed,
      }),
    );
  }

  private reportGenericInteraction(
    result: GenericStreamAttemptResult,
    interaction: ReturnType<typeof buildGenericGeneratorPrompt>["interaction"],
  ): void {
    if (!interaction || !result.interactionId) return;
    this.onInteractionResult?.({
      text: result.raw,
      interactionId: result.interactionId,
      usedInteraction: true,
      replayed: result.replayed,
    });
  }

  private async *streamGenericGeneratorAttempt(
    fullPrompt: string,
    interaction: ReturnType<typeof buildGenericGeneratorPrompt>["interaction"],
    gateway: AIGeneratorGateway,
    signal?: AbortSignal,
  ): AsyncGenerator<GenerationEvent, GenericStreamAttemptResult> {
    const result: GenericStreamAttemptResult = {
      raw: "",
      replayed: false,
      completed: false,
      failed: false,
      cancelled: false,
    };
    try {
      const completeStream = gateway.completeStream;
      if (!completeStream) return { ...result, failed: true };
      for await (const event of completeStream.call(
        gateway,
        fullPrompt,
        SYSTEM_INSTRUCTION,
        { interaction, signal },
      )) {
        captureGenericStreamCompletion(event, result);
        yield event;
      }
    } catch {
      return {
        ...result,
        failed: !signal?.aborted,
        cancelled: !!signal?.aborted,
      };
    }
    if (signal?.aborted) {
      return { ...result, failed: false, cancelled: true };
    }
    return { ...result, failed: !result.completed, cancelled: false };
  }

  async *generateDraftStream(
    request: GeneratorRunRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<
    GenerationEvent | { type: "draft"; draft: GeneratedDraft }
  > {
    switch (request.generatorId) {
      case "tome":
        yield* this.generateTomeDraftStream(request, signal);
        return;
      case "heist":
        yield* this.generateHeistDraftStream(request, signal);
        return;
      case "council-vote":
        yield* this.generateCouncilVoteDraftStream(request, signal);
        return;
      default:
        yield* this.generateGenericDraftStream(request, signal);
    }
  }
}

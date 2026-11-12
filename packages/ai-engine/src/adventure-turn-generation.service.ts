import {
  buildAdventurePrompt,
  type AdventureTurnProposal,
} from "@codex/adventure-engine";
import { aiClientManager as defaultAiClientManager } from "./client-manager";
import type {
  AdventureAIClient,
  AdventureTurnGenerationRequest,
  AdventurePrompt,
  AdventureGenerationOptions,
} from "./adventure-generation.types";
import { AdventureInteractionContext } from "./adventure-interaction-context";
import { AdventureInteractionGeneration } from "./adventure-interaction-generation";
import { AdventureContentGeneration } from "./adventure-content-generation";
import { streamAborted } from "./adventure-narration-stream";
import {
  adventureTurnResponseSchema,
  isInvalidAdventureResponse,
} from "./adventure-response-schema";

export type {
  AdventureAIClient,
  AdventureTurnGenerationRequest,
} from "./adventure-generation.types";
export { extractAdventureNarrationPrefix } from "./adventure-narration-stream";

function canUseStatelessFallback(error: unknown): boolean {
  const reason = error instanceof Error ? error.message.toLowerCase() : "";
  return /interaction-client-unavailable|interaction-stream-unavailable|interaction.*(?:unsupported|not supported|not available)/.test(
    reason,
  );
}

/** Coordinates turn generation while keeping the existing import path and API. */
export class AdventureTurnGenerationService {
  private readonly interactionContext = new AdventureInteractionContext();
  private readonly interactionGeneration: AdventureInteractionGeneration;
  private readonly contentGeneration: AdventureContentGeneration;

  constructor(
    private readonly aiClient: AdventureAIClient = defaultAiClientManager,
  ) {
    this.interactionGeneration = new AdventureInteractionGeneration(
      aiClient,
      this.interactionContext,
    );
    this.contentGeneration = new AdventureContentGeneration(
      aiClient,
      this.interactionContext,
    );
  }

  clearInteraction(sessionId: string): void {
    this.interactionContext.clear(sessionId);
  }

  confirmInteraction(sessionId: string, savedRevision?: number): void {
    this.interactionContext.confirm(sessionId, savedRevision);
  }

  private async generateBuffered(
    request: AdventureTurnGenerationRequest,
    prompt: AdventurePrompt,
    systemInstruction: string,
    options: AdventureGenerationOptions,
    forceStructuredOutput = false,
  ): Promise<AdventureTurnProposal> {
    streamAborted(options.signal ?? request.signal);
    if (
      this.aiClient.sendInteraction &&
      !options.apiKey &&
      !forceStructuredOutput
    ) {
      return this.interactionGeneration.generate(
        request,
        prompt,
        systemInstruction,
        options,
      );
    }
    return this.contentGeneration.buffered(
      request,
      prompt,
      systemInstruction,
      options,
    );
  }

  async generate(
    request: AdventureTurnGenerationRequest,
    options: AdventureGenerationOptions = {},
  ): Promise<AdventureTurnProposal> {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("offline");
    }
    const signal = options.signal ?? request.signal;
    streamAborted(signal);
    const prompt = buildAdventurePrompt(request);
    const systemInstruction =
      prompt.behavior +
      "\n\nReturn only valid JSON that matches this response schema:\n" +
      JSON.stringify(adventureTurnResponseSchema);

    // System-proxy requests use provider-managed history by default. Custom
    // API keys remain on the stateless direct-SDK path, without cloud storage.
    let fallbackToStateless = false;
    if (
      !options.apiKey &&
      (this.aiClient.sendInteraction || this.aiClient.sendInteractionStream)
    ) {
      try {
        return await this.interactionGeneration.generate(
          request,
          prompt,
          systemInstruction,
          options,
        );
      } catch (error) {
        if (!canUseStatelessFallback(error)) throw error;
        // Providers that cannot store conversations retain the original
        // stateless structured streaming path. No remote ID is persisted.
        this.clearInteraction(request.session.id);
        fallbackToStateless = true;
      }
    }

    return this.generateStateless(
      request,
      prompt,
      systemInstruction,
      options,
      fallbackToStateless,
    );
  }

  private async generateStateless(
    request: AdventureTurnGenerationRequest,
    prompt: AdventurePrompt,
    systemInstruction: string,
    options: AdventureGenerationOptions,
    fallbackToStateless: boolean,
  ): Promise<AdventureTurnProposal> {
    const signal = options.signal ?? request.signal;
    if (request.onNarration) {
      try {
        const streamed = await this.contentGeneration.stream(
          request,
          prompt,
          systemInstruction,
          options,
        );
        if (streamed) return streamed;
      } catch (error) {
        // A complete stream can still contain malformed JSON or a response
        // that violates the turn schema. Retry once with the provider's
        // structured output constraint; never retry transport or abort errors.
        if (!isInvalidAdventureResponse(error)) throw error;
        streamAborted(signal);
        // The preview was never committed and may differ from the repaired
        // result. Withdraw it before trying again.
        request.onNarration("");
        return this.generateBuffered(
          request,
          prompt,
          systemInstruction +
            "\n\nThe preceding response was invalid. Regenerate the turn as one complete JSON object matching the supplied schema. Do not include markdown.",
          options,
          true,
        );
      }
    }

    return this.generateBuffered(
      request,
      prompt,
      systemInstruction,
      options,
      fallbackToStateless,
    );
  }
}

export const adventureTurnGenerationService =
  new AdventureTurnGenerationService();

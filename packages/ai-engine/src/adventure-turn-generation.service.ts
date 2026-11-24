import { buildAdventurePrompt } from "@codex/adventure-engine";
import { aiClientManager as defaultAiClientManager } from "./client-manager";
import type {
  AdventureAIClient,
  AdventureGenerationOptions,
  AdventureGenerationInfo,
  AdventureTurnGenerationRequest,
  AdventureTurnGenerationResult,
  AdventurePrompt,
} from "./adventure-generation.types";
import { AdventureInteractionContext } from "./adventure-interaction-context";
import {
  AdventureInteractionGeneration,
  DEFAULT_ADVENTURE_MODEL,
  DEFAULT_ADVENTURE_REASONING_EFFORT,
} from "./adventure-interaction-generation";
import { AdventureContentGeneration } from "./adventure-content-generation";
import { streamAborted } from "./adventure-narration-stream";
import {
  adventureTurnResponseSchema,
  isInvalidAdventureResponse,
} from "./adventure-response-schema";

export type {
  AdventureAIClient,
  AdventureGenerationInfo,
  AdventureTurnGenerationRequest,
  AdventureTurnGenerationResult,
  AdventureGenerationOptions,
} from "./adventure-generation.types";
export { extractAdventureNarrationPrefix } from "./adventure-narration-stream";

function canUseStatelessFallback(error: unknown): boolean {
  const reason = error instanceof Error ? error.message.toLowerCase() : "";
  return /interaction-client-unavailable|interaction-stream-unavailable|interaction.*(?:unsupported|not supported|not available)/.test(
    reason,
  );
}

function promptScenarioIds(prompt: AdventurePrompt): string[] {
  const state = JSON.parse(prompt.state) as Record<string, unknown>;
  const scenarios = state["GM-ONLY scenarios"];
  return Array.isArray(scenarios)
    ? scenarios
        .flatMap((item) =>
          item &&
          typeof item === "object" &&
          "id" in item &&
          typeof item.id === "string"
            ? [item.id]
            : [],
        )
        .slice(0, 32)
    : [];
}

function promptDiagnostics(
  prompt: AdventurePrompt,
): Pick<
  AdventureGenerationInfo,
  "requestChars" | "sourceCounts" | "scenarioIds"
> {
  return {
    requestChars: prompt.serialized.length,
    sourceCounts: {
      anchors: Math.min(prompt.anchors.length, 1000),
      relevant: Math.min(prompt.relevant.length, 1000),
    },
    scenarioIds: promptScenarioIds(prompt),
  };
}

function effectiveReasoningEffort(
  transport: AdventureGenerationInfo["transport"],
  options: AdventureGenerationOptions,
): AdventureGenerationInfo["reasoningEffort"] {
  return transport === "interaction"
    ? (options.reasoningEffort ?? DEFAULT_ADVENTURE_REASONING_EFFORT)
    : options.reasoningEffort;
}

function buildGenerationInfo(
  proposal: AdventureTurnGenerationResult,
  transport: AdventureGenerationInfo["transport"],
  options: AdventureGenerationOptions,
  prompt: AdventurePrompt,
): AdventureGenerationInfo {
  const priorInfo = proposal.generationInfo ?? {};
  const diagnostics = promptDiagnostics(prompt);
  const generationInfo: AdventureGenerationInfo = {
    ...priorInfo,
    ...diagnostics,
    requestChars: priorInfo.requestChars ?? diagnostics.requestChars,
    sourceCounts: priorInfo.sourceCounts ?? diagnostics.sourceCounts,
    scenarioIds: priorInfo.scenarioIds ?? diagnostics.scenarioIds,
    transport,
    modelKey: options.modelName ?? DEFAULT_ADVENTURE_MODEL,
  };
  if (transport === "stateless") {
    generationInfo.threadMode = "new";
    delete generationInfo.resetReason;
  }
  const reasoningEffort = effectiveReasoningEffort(transport, options);
  if (reasoningEffort) generationInfo.reasoningEffort = reasoningEffort;
  return generationInfo;
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

  /** #5112: classify how a proposal was produced for committed-turn diagnostics. */
  private withGenerationInfo(
    proposal: AdventureTurnGenerationResult,
    transport: AdventureGenerationInfo["transport"],
    options: AdventureGenerationOptions,
    prompt: AdventurePrompt,
  ): AdventureTurnGenerationResult {
    const generationInfo = buildGenerationInfo(
      proposal,
      transport,
      options,
      prompt,
    );
    return Object.assign(proposal, { generationInfo });
  }

  private async generateBuffered(
    request: AdventureTurnGenerationRequest,
    prompt: AdventurePrompt,
    systemInstruction: string,
    options: AdventureGenerationOptions,
    forceStructuredOutput = false,
  ): Promise<AdventureTurnGenerationResult> {
    streamAborted(options.signal ?? request.signal);
    if (
      request.contextMode !== "reconstructed" &&
      this.aiClient.sendInteraction &&
      !options.apiKey &&
      !forceStructuredOutput
    ) {
      return this.withGenerationInfo(
        await this.interactionGeneration.generate(
          request,
          prompt,
          systemInstruction,
          options,
        ),
        "interaction",
        options,
        prompt,
      );
    }
    return this.withGenerationInfo(
      await this.contentGeneration.buffered(
        request,
        prompt,
        systemInstruction,
        options,
      ),
      "stateless",
      options,
      prompt,
    );
  }

  async generate(
    request: AdventureTurnGenerationRequest,
    options: AdventureGenerationOptions = {},
  ): Promise<AdventureTurnGenerationResult> {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      throw new Error("offline");
    }
    const signal = options.signal ?? request.signal;
    streamAborted(signal);
    const prompt = buildAdventurePrompt(request);
    const systemInstruction =
      prompt.behavior +
      "\n\nReturn only valid JSON that matches this response schema:\n" +
      JSON.stringify(adventureTurnResponseSchema);
    return this.generateWithPrompt(request, prompt, systemInstruction, options);
  }

  private async generateWithPrompt(
    request: AdventureTurnGenerationRequest,
    prompt: AdventurePrompt,
    systemInstruction: string,
    options: AdventureGenerationOptions,
  ): Promise<AdventureTurnGenerationResult> {
    const interaction = await this.tryInteraction(
      request,
      prompt,
      systemInstruction,
      options,
    );
    if (interaction.result) return interaction.result;
    return this.generateStateless(
      request,
      prompt,
      systemInstruction,
      options,
      interaction.fallbackToStateless,
    );
  }

  private async tryInteraction(
    request: AdventureTurnGenerationRequest,
    prompt: AdventurePrompt,
    systemInstruction: string,
    options: AdventureGenerationOptions,
  ): Promise<{
    result?: AdventureTurnGenerationResult;
    fallbackToStateless: boolean;
  }> {
    if (!this.canUseInteraction(request, options)) {
      return { fallbackToStateless: false };
    }
    try {
      const proposal = await this.interactionGeneration.generate(
        request,
        prompt,
        systemInstruction,
        options,
      );
      return {
        result: this.withGenerationInfo(
          proposal,
          "interaction",
          options,
          prompt,
        ),
        fallbackToStateless: false,
      };
    } catch (error) {
      if (!canUseStatelessFallback(error)) throw error;
      // Providers that cannot store conversations retain the original
      // stateless structured streaming path. No remote ID is persisted.
      this.clearInteraction(request.session.id);
      return { fallbackToStateless: true };
    }
  }

  private canUseInteraction(
    request: AdventureTurnGenerationRequest,
    options: AdventureGenerationOptions,
  ): boolean {
    return (
      request.contextMode !== "reconstructed" &&
      !options.apiKey &&
      Boolean(
        this.aiClient.sendInteraction || this.aiClient.sendInteractionStream,
      )
    );
  }

  private async generateStateless(
    request: AdventureTurnGenerationRequest,
    prompt: AdventurePrompt,
    systemInstruction: string,
    options: AdventureGenerationOptions,
    fallbackToStateless: boolean,
  ): Promise<AdventureTurnGenerationResult> {
    const signal = options.signal ?? request.signal;
    if (request.onNarration) {
      try {
        const streamed = await this.contentGeneration.stream(
          request,
          prompt,
          systemInstruction,
          options,
        );
        if (streamed) {
          return this.withGenerationInfo(
            streamed,
            "stateless",
            options,
            prompt,
          );
        }
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

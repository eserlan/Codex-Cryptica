import type {
  AdventureAIClient,
  AdventureTurnGenerationRequest,
} from "./adventure-generation.types";
export type {
  AdventureAIClient,
  AdventureTurnGenerationRequest,
} from "./adventure-generation.types";
export { extractAdventureNarrationPrefix } from "./adventure-narration-stream";
import {
  collectAdventureStream,
  publishAdventureNarration,
  streamAborted,
  type AdventureStream,
  type AdventureStreamEvent,
} from "./adventure-narration-stream";
import {
  adventureTurnResponseSchema,
  buildAdventureContentInput,
  parseAdventureResponse,
} from "./adventure-response-schema";
import {
  aiClientManager as defaultAiClientManager,
  InteractionExpiredError,
} from "./client-manager";
import {
  buildAdventurePrompt,
  type AdventureTurnProposal,
} from "@codex/adventure-engine";
import { AdventureInteractionContext } from "./adventure-interaction-context";
import { buildAdventureInteractionInput } from "./adventure-interaction-input";

/** Stream failures that are safe to retry once as a buffered Interaction. */
const BUFFERED_FALLBACK_ERRORS = new Set([
  "interaction-stream-unavailable",
  "interaction-stream-incomplete",
  "interaction-stream-read-error",
]);

export class AdventureTurnGenerationService {
  private readonly interactionContext = new AdventureInteractionContext();

  constructor(
    private readonly aiClient: AdventureAIClient = defaultAiClientManager,
  ) {}

  clearInteraction(sessionId: string): void {
    this.interactionContext.clear(sessionId);
  }

  confirmInteraction(sessionId: string, savedRevision?: number): void {
    this.interactionContext.confirm(sessionId, savedRevision);
  }

  // fallow-ignore-next-line complexity
  private async generateViaInteraction(
    request: AdventureTurnGenerationRequest,
    prompt: ReturnType<typeof buildAdventurePrompt>,
    systemInstruction: string,
    options: { modelName?: string; signal?: AbortSignal },
  ): Promise<AdventureTurnProposal> {
    const signal = options.signal ?? request.signal;
    const sendInteraction = this.aiClient.sendInteraction;
    const sendStream = this.aiClient.sendInteractionStream;
    if (!sendInteraction && !sendStream)
      throw new Error("interaction-client-unavailable");

    let interaction = this.interactionContext.prepare(
      request.session,
      prompt,
      options.modelName ?? "luna-fast",
    );

    const instruction =
      systemInstruction +
      "\n\nOn continuation requests, stateDelta contains only changed top-level state fields and supersedes your previous state; null deletes a field. The present input and retrieved Vault sources outrank any previous turn. Never reveal GM-only fields.";
    // fallow-ignore-next-line complexity
    const send = async (
      repair?: string,
      preferStream = true,
    ): Promise<{
      id: string;
      text: string;
      state: Record<string, unknown>;
      sourceEntries: Array<{ id: string; snippet: string; hash: string }>;
    }> => {
      streamAborted(signal);
      const prepared = buildAdventureInteractionInput(
        prompt,
        interaction,
        repair,
      );
      const params = {
        model: options.modelName ?? "luna-fast",
        input: prepared.input,
        systemInstruction: instruction,
        previousInteractionId: interaction.previousInteractionId,
        generationConfig: { responseMimeType: "application/json" },
        signal,
      };
      // Streaming with provider-held history: the proxy returns only
      // player-safe model_output text, never thought/GM-only provider events.
      if (preferStream && request.onNarration && sendStream) {
        try {
          let buffer = "";
          let finalId = "";
          let completed = false;
          for await (const event of sendStream.call(this.aiClient, params)) {
            streamAborted(signal);
            if (event.type === "error") throw new Error(event.error);
            if (event.type === "delta") buffer += event.text;
            if (event.type === "complete") {
              buffer = event.text || buffer;
              finalId = event.id;
              completed = true;
            }
            publishAdventureNarration(request, buffer);
          }
          streamAborted(signal);
          if (!completed || !finalId)
            throw new Error("interaction-stream-incomplete");
          return { ...prepared, id: finalId, text: buffer };
        } catch (error) {
          if (
            !(error instanceof Error) ||
            !BUFFERED_FALLBACK_ERRORS.has(error.message) ||
            !sendInteraction
          )
            throw error;
          streamAborted(signal);
          // Old proxy / provider does not support conversation SSE yet, or the
          // stream ended before a completed turn (nothing was committed, so
          // the same continuation id is still valid). Buffered Interactions
          // still preserve continuity and JSON mode.
        }
      }
      if (!sendInteraction) throw new Error("interaction-client-unavailable");
      const result = await sendInteraction.call(this.aiClient, params);
      streamAborted(signal);
      return { ...prepared, id: result.id, text: result.text };
    };

    try {
      let result;
      try {
        result = await send();
      } catch (error) {
        if (!(error instanceof InteractionExpiredError)) throw error;
        // Retention expiry: rebuild from current session and local transcript.
        this.clearInteraction(request.session.id);
        interaction = this.interactionContext.get(request.session.id);
        result = await send();
      }
      let proposal: AdventureTurnProposal;
      try {
        proposal = parseAdventureResponse(result.text);
      } catch (error) {
        if (
          !(error instanceof Error) ||
          error.message !== "invalid-adventure-response"
        )
          throw error;
        streamAborted(signal);
        request.onNarration?.("");
        // Retry the same uncommitted action against the *last committed*
        // conversation ID; never chain from an invalid model response.
        result = await send(
          "Previous JSON failed validation. Return a complete corrected JSON proposal with all required fields.",
          !sendInteraction,
        );
        proposal = parseAdventureResponse(result.text);
      }
      streamAborted(signal);
      if (!result.id) throw new Error("interaction-id-missing");
      interaction.pending = {
        id: result.id,
        revision: request.session.revision,
        modelName: options.modelName ?? "luna-fast",
        state: result.state,
        sourceEntries: result.sourceEntries,
      };
      return proposal;
    } catch (error) {
      // Never retain a conversation containing a rejected/aborted output.
      this.clearInteraction(request.session.id);
      throw error;
    }
  }

  /**
   * Adventure streaming uses the standard structured-generation SSE path.
   * The Interactions endpoint currently buffers complete JSON, so when
   * streaming is available we send a self-contained prompt (recent transcript,
   * world state and selected Vault sources) rather than a delta interaction.
   */
  private async generateViaStream(
    request: AdventureTurnGenerationRequest,
    prompt: ReturnType<typeof buildAdventurePrompt>,
    systemInstruction: string,
    options: { apiKey?: string; modelName?: string; signal?: AbortSignal },
  ): Promise<AdventureTurnProposal | null> {
    const signal = options.signal ?? request.signal;
    const model = await this.aiClient.getModel(
      options.apiKey ?? "",
      options.modelName ?? "luna-fast",
      systemInstruction,
    );
    const streamModel = model as typeof model & {
      generateContentStream?: (
        input: unknown,
        signal?: AbortSignal,
      ) => AsyncIterable<AdventureStreamEvent> | Promise<AdventureStream>;
    };
    if (!streamModel.generateContentStream) return null;
    // The streamed request is self-contained; stale Interactions state is
    // never reused after switching transport.
    this.clearInteraction(request.session.id);
    const input = buildAdventureContentInput(prompt.serialized);
    streamAborted(signal);
    const stream = await streamModel.generateContentStream(input, signal);
    const buffer = await collectAdventureStream(
      stream,
      (text) => publishAdventureNarration(request, text, signal),
      signal,
    );
    return parseAdventureResponse(buffer);
  }

  private async generateBuffered(
    request: AdventureTurnGenerationRequest,
    prompt: ReturnType<typeof buildAdventurePrompt>,
    systemInstruction: string,
    options: { apiKey?: string; modelName?: string; signal?: AbortSignal },
    forceStructuredOutput = false,
  ): Promise<AdventureTurnProposal> {
    streamAborted(options.signal ?? request.signal);
    if (
      this.aiClient.sendInteraction &&
      !options.apiKey &&
      !forceStructuredOutput
    ) {
      return this.generateViaInteraction(
        request,
        prompt,
        systemInstruction,
        options,
      );
    }
    const model = await this.aiClient.getModel(
      options.apiKey ?? "",
      options.modelName ?? "luna-fast",
      systemInstruction,
    );
    const result = await model.generateContent(
      buildAdventureContentInput(prompt.serialized),
      { signal: options.signal ?? request.signal },
    );
    streamAborted(options.signal ?? request.signal);
    return parseAdventureResponse(result.response.text());
  }

  // fallow-ignore-next-line complexity
  async generate(
    request: AdventureTurnGenerationRequest,
    options: { apiKey?: string; modelName?: string; signal?: AbortSignal } = {},
  ): Promise<AdventureTurnProposal> {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("offline");
    }
    const signal = options.signal ?? request.signal;
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
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
        return await this.generateViaInteraction(
          request,
          prompt,
          systemInstruction,
          options,
        );
      } catch (error) {
        const reason =
          error instanceof Error ? error.message.toLowerCase() : "";
        if (
          !/interaction-client-unavailable|interaction-stream-unavailable|interaction.*(?:unsupported|not supported|not available)/.test(
            reason,
          )
        )
          throw error;
        // Providers that cannot store conversations retain the original
        // stateless structured streaming path. No remote ID is persisted.
        this.clearInteraction(request.session.id);
        fallbackToStateless = true;
      }
    }

    if (request.onNarration) {
      try {
        const streamed = await this.generateViaStream(
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
        if (
          !(error instanceof Error) ||
          error.message !== "invalid-adventure-response"
        ) {
          throw error;
        }
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

import type { AdventureTurnProposal } from "@codex/adventure-engine";
import type {
  AdventureAIClient,
  AdventureTurnGenerationRequest,
  AdventurePrompt,
  AdventureGenerationOptions,
} from "./adventure-generation.types";
import { AdventureInteractionContext } from "./adventure-interaction-context";
import {
  collectAdventureStream,
  publishAdventureNarration,
  streamAborted,
  type AdventureStream,
  type AdventureStreamEvent,
} from "./adventure-narration-stream";
import {
  buildAdventureContentInput,
  parseAdventureResponse,
} from "./adventure-response-schema";

/** Stateless structured generation for direct keys and providers without history. */
export class AdventureContentGeneration {
  constructor(
    private readonly aiClient: AdventureAIClient,
    private readonly context: AdventureInteractionContext,
  ) {}

  /**
   * Adventure streaming uses the standard structured-generation SSE path.
   * The Interactions endpoint currently buffers complete JSON, so when
   * streaming is available we send a self-contained prompt (recent transcript,
   * world state and selected Vault sources) rather than a delta interaction.
   */
  async stream(
    request: AdventureTurnGenerationRequest,
    prompt: AdventurePrompt,
    systemInstruction: string,
    options: AdventureGenerationOptions,
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
    this.context.clear(request.session.id);
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

  async buffered(
    request: AdventureTurnGenerationRequest,
    prompt: AdventurePrompt,
    systemInstruction: string,
    options: AdventureGenerationOptions,
  ): Promise<AdventureTurnProposal> {
    streamAborted(options.signal ?? request.signal);
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
}

import type {
  AdventureAIClient,
  AdventureTurnGenerationRequest,
} from "./adventure-generation.types";
import {
  publishAdventureNarration,
  streamAborted,
} from "./adventure-narration-stream";

type InteractionParams = Parameters<
  NonNullable<AdventureAIClient["sendInteraction"]>
>[0];

/** Stream failures that are safe to retry once as a buffered Interaction. */
const BUFFERED_FALLBACK_ERRORS = new Set([
  "interaction-stream-unavailable",
  "interaction-stream-incomplete",
  "interaction-stream-read-error",
]);

/** Sends one uncommitted turn; all retries use the same continuation ID. */
export class AdventureInteractionTransport {
  private readonly sendInteraction: AdventureAIClient["sendInteraction"];
  private readonly sendStream: AdventureAIClient["sendInteractionStream"];

  constructor(private readonly aiClient: AdventureAIClient) {
    this.sendInteraction = aiClient.sendInteraction;
    this.sendStream = aiClient.sendInteractionStream;
  }

  get available(): boolean {
    return !!(this.sendInteraction || this.sendStream);
  }
  get canBuffer(): boolean {
    return !!this.sendInteraction;
  }

  async send(
    request: AdventureTurnGenerationRequest,
    params: InteractionParams,
    preferStream = true,
  ): Promise<{ id: string; text: string }> {
    if (preferStream && request.onNarration && this.sendStream) {
      try {
        return await this.stream(request, params, this.sendStream);
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !BUFFERED_FALLBACK_ERRORS.has(error.message) ||
          !this.sendInteraction
        )
          throw error;
        streamAborted(params.signal);
        // Old proxy / provider does not support conversation SSE yet, or the
        // stream ended before a completed turn (nothing was committed, so
        // the same continuation id is still valid). Buffered Interactions
        // still preserve continuity and JSON mode.
      }
    }
    if (!this.sendInteraction)
      throw new Error("interaction-client-unavailable");
    const result = await this.sendInteraction.call(this.aiClient, params);
    streamAborted(params.signal);
    return { id: result.id, text: result.text };
  }

  private async stream(
    request: AdventureTurnGenerationRequest,
    params: InteractionParams,
    sendStream: NonNullable<AdventureAIClient["sendInteractionStream"]>,
  ): Promise<{ id: string; text: string }> {
    let buffer = "";
    let finalId = "";
    let completed = false;
    // The proxy returns only player-safe model_output text, never thought/GM-only events.
    for await (const event of sendStream.call(this.aiClient, params)) {
      streamAborted(params.signal);
      if (event.type === "error") throw new Error(event.error);
      if (event.type === "delta") buffer += event.text;
      if (event.type === "complete") {
        buffer = event.text || buffer;
        finalId = event.id;
        completed = true;
      }
      publishAdventureNarration(request, buffer);
    }
    streamAborted(params.signal);
    if (!completed || !finalId)
      throw new Error("interaction-stream-incomplete");
    return { id: finalId, text: buffer };
  }
}

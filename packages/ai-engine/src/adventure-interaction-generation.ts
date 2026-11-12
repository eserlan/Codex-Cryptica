import type { AdventureTurnProposal } from "@codex/adventure-engine";
import { InteractionExpiredError } from "./client-manager";
import type {
  AdventureAIClient,
  AdventureInteraction,
  AdventureTurnGenerationRequest,
  AdventurePrompt,
  AdventureGenerationOptions,
} from "./adventure-generation.types";
import { AdventureInteractionContext } from "./adventure-interaction-context";
import { buildAdventureInteractionInput } from "./adventure-interaction-input";
import { AdventureInteractionTransport } from "./adventure-interaction-transport";
import { streamAborted } from "./adventure-narration-stream";
import {
  parseAdventureResponse,
  isInvalidAdventureResponse,
} from "./adventure-response-schema";

type InteractionResult = ReturnType<typeof buildAdventureInteractionInput> & {
  id: string;
  text: string;
};
type SendInteraction = (
  repair?: string,
  preferStream?: boolean,
) => Promise<InteractionResult>;

/** Recovery is bounded to one fresh request; repair failures are not expiry retries. */
async function sendWithExpiryRecovery(
  send: SendInteraction,
  reset: () => void,
): Promise<InteractionResult> {
  try {
    return await send();
  } catch (error) {
    if (!(error instanceof InteractionExpiredError)) throw error;
    reset();
    return send();
  }
}

async function parseWithRepair(
  result: InteractionResult,
  send: SendInteraction,
  request: AdventureTurnGenerationRequest,
  signal: AbortSignal | undefined,
  preferStream: boolean,
): Promise<{ result: InteractionResult; proposal: AdventureTurnProposal }> {
  try {
    return { result, proposal: parseAdventureResponse(result.text) };
  } catch (error) {
    if (!isInvalidAdventureResponse(error)) throw error;
    streamAborted(signal);
    request.onNarration?.("");
    // Never chain from an invalid reply: repair the same uncommitted action
    // against the last committed conversation ID.
    const repaired = await send(
      "Previous JSON failed validation. Return a complete corrected JSON proposal with all required fields.",
      preferStream,
    );
    return {
      result: repaired,
      proposal: parseAdventureResponse(repaired.text),
    };
  }
}

/** Generates and stages replies; only the context acknowledgement commits history. */
export class AdventureInteractionGeneration {
  constructor(
    private readonly aiClient: AdventureAIClient,
    private readonly context: AdventureInteractionContext,
  ) {}

  async generate(
    request: AdventureTurnGenerationRequest,
    prompt: AdventurePrompt,
    systemInstruction: string,
    options: AdventureGenerationOptions,
  ): Promise<AdventureTurnProposal> {
    const signal = options.signal ?? request.signal;
    let interaction: AdventureInteraction;
    const { transport, send } = this.createSender(
      request,
      prompt,
      systemInstruction,
      options,
      () => interaction,
    );
    interaction = this.context.prepare(
      request.session,
      prompt,
      options.modelName ?? "luna-fast",
    );

    try {
      const initial = await sendWithExpiryRecovery(send, () => {
        // Retention expiry: rebuild from current session and local transcript.
        this.context.clear(request.session.id);
        interaction = this.context.get(request.session.id);
      });
      const { result, proposal } = await parseWithRepair(
        initial,
        send,
        request,
        signal,
        !transport.canBuffer,
      );
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
      this.context.clear(request.session.id);
      throw error;
    }
  }
  private createSender(
    request: AdventureTurnGenerationRequest,
    prompt: AdventurePrompt,
    systemInstruction: string,
    options: AdventureGenerationOptions,
    getInteraction: () => AdventureInteraction,
  ) {
    const signal = options.signal ?? request.signal;
    const transport = new AdventureInteractionTransport(this.aiClient);
    if (!transport.available) throw new Error("interaction-client-unavailable");
    const instruction =
      systemInstruction +
      "\n\nOn continuation requests, stateDelta contains only changed top-level state fields and supersedes your previous state; null deletes a field. The present input and retrieved Vault sources outrank any previous turn. Never reveal GM-only fields.";
    const send = async (
      repair?: string,
      preferStream = true,
    ): Promise<InteractionResult> => {
      streamAborted(signal);
      const interaction = getInteraction();
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
      const result = await transport.send(request, params, preferStream);
      return { ...prepared, id: result.id, text: result.text };
    };

    return { transport, send };
  }
}

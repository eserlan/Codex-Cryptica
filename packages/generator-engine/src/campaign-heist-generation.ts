import {
  buildCampaignHeistPrompt,
  SYSTEM_INSTRUCTION,
} from "./campaign-generator-registry";
import { streamHeistGeneration } from "./heist-generation";
import { isTitleBanned } from "./naming-policy";
import type {
  AIGeneratorGateway,
  GenerationEvent,
  GeneratorRunRequest,
} from "./campaign-generator-types";
import type { PublicGeneratorOutput } from "./public-generator-adapters";

/** Campaign transport adapter; the heist policy itself lives in the shared flow. */
export async function* streamCampaignHeist(
  request: GeneratorRunRequest,
  gateway: AIGeneratorGateway,
  signal?: AbortSignal,
): AsyncGenerator<GenerationEvent, PublicGeneratorOutput> {
  signal?.throwIfAborted();
  // Resolve random options once, including when a banned name requires a retry.
  const prompt = buildCampaignHeistPrompt({
    ...request,
    interaction: undefined,
  });
  const banned = new Set([
    ...(request.vaultContext?.bannedNames ?? []),
    ...(request.vaultContext?.existingTitles ?? []),
  ]);
  for (let attempt = 0; attempt < 3; attempt++) {
    signal?.throwIfAborted();
    const chat = await gateway.startChat?.(SYSTEM_INSTRUCTION);
    // Complete-only gateways replay the actual conversation, including the
    // original grounded request, rather than inventing a summary for review.
    const history: Array<{ role: "user" | "assistant"; content: string }> = [];
    async function* send(message: string): AsyncGenerator<GenerationEvent> {
      signal?.throwIfAborted();
      history.push({ role: "user", content: message });
      const input =
        history.length === 1
          ? message
          : `Continue this conversation. Return only the requested JSON.\n${JSON.stringify(history)}`;
      let response: string | undefined;
      if (chat?.sendStream || (!chat && gateway.completeStream)) {
        const stream = chat?.sendStream
          ? chat.sendStream(message, signal)
          : gateway.completeStream!(input, SYSTEM_INSTRUCTION, { signal });
        for await (const event of stream) {
          signal?.throwIfAborted();
          if (event.type === "complete") response = event.text;
          yield event;
        }
      } else {
        const result = chat
          ? await chat.send(message)
          : await gateway.complete(input, SYSTEM_INSTRUCTION, { signal });
        signal?.throwIfAborted();
        response = typeof result === "string" ? result : result.text;
        yield { type: "complete", text: response };
      }
      if (response !== undefined)
        history.push({ role: "assistant", content: response });
    }
    const result = yield* streamHeistGeneration(prompt, send, { signal });
    if (!isTitleBanned(result.output.title, banned)) return result.output;
    // A repair may rename a previously valid draft to a forbidden title.
    if (!isTitleBanned(result.initial.title, banned)) return result.initial;
  }
  throw new Error("The heist repeatedly reused an existing name.");
}

export async function generateCampaignHeist(
  request: GeneratorRunRequest,
  gateway: AIGeneratorGateway,
) {
  const stream = streamCampaignHeist(request, gateway);
  let next = await stream.next();
  while (!next.done) next = await stream.next();
  return next.value;
}

import {
  buildHeistRepairPrompt,
  parseHeistResponse,
  type HeistPrompt,
} from "./public-heist";
import { validateHeist, type HeistFinding } from "./heist-validation";
import type { PublicGeneratorOutput } from "./public-generator-adapters";
import type { GenerationEvent } from "./campaign-generator-types";

export interface HeistGenerationResult {
  output: PublicGeneratorOutput;
  initial: PublicGeneratorOutput;
  reviewed?: PublicGeneratorOutput;
  before: HeistFinding[];
  after: HeistFinding[];
  reviewStatus: "accepted" | "rejected" | "failed";
}

export interface HeistGenerationOptions {
  signal?: AbortSignal;
  /** Caller-specific constraints, such as existing campaign entity names. */
  acceptOutput?: (output: PublicGeneratorOutput) => boolean;
}

export type HeistSendStream = (
  message: string,
) => AsyncGenerator<GenerationEvent>;

/** Shared public, campaign and evaluation workflow. Transport owns chat history. */
export async function* streamHeistGeneration(
  prompt: HeistPrompt,
  send: HeistSendStream,
  options: HeistGenerationOptions = {},
): AsyncGenerator<GenerationEvent, HeistGenerationResult> {
  const checkCancellation = () => options.signal?.throwIfAborted();
  async function* turn(
    message: string,
  ): AsyncGenerator<GenerationEvent, string> {
    checkCancellation();
    let response: string | undefined;
    for await (const event of send(message)) {
      checkCancellation();
      if (event.type === "error") throw new Error(event.error);
      if (event.type === "complete") response = event.text;
      // Only the final selected document is complete. Intermediate turn output
      // may be shown progressively, but must never be mistaken for a saved draft.
      if (event.type !== "complete") yield event;
    }
    checkCancellation();
    if (response === undefined)
      throw new Error("Heist generation ended without a response.");
    return response;
  }
  const findings = (output: PublicGeneratorOutput) =>
    validateHeist({
      heistType: prompt.resolved.heistType,
      genre: prompt.resolved.genre,
      content: output.content ?? "",
      lore: output.lore ?? "",
    });
  const parse = (raw: string) => {
    const output = parseHeistResponse(raw, prompt.resolved);
    if (!output.content.trim() || !output.lore.trim())
      throw new Error("Heist response is empty.");
    return output;
  };
  yield { type: "phase", label: "Creating the heist" };
  const initial = parse(yield* turn(prompt.userMessage));
  const before = findings(initial);
  let output = initial;
  let reviewed: PublicGeneratorOutput | undefined;
  let after = before;
  let reviewStatus: HeistGenerationResult["reviewStatus"] = "failed";
  try {
    yield { type: "phase", label: "Checking the heist" };
    const repaired = parse(
      yield* turn(buildHeistRepairPrompt(before, prompt.resolved)),
    );
    reviewed = repaired;
    after = findings(repaired);
    const structuralCount = (list: HeistFinding[]) =>
      list.filter((f) => f.severity === "structural").length;
    // Semantic improvements need not change deterministic counts. Keep the
    // original if review increases structural damage or violates caller policy.
    if (
      structuralCount(after) <= structuralCount(before) &&
      (options.acceptOutput?.(repaired) ?? true)
    ) {
      output = repaired;
      reviewStatus = "accepted";
    } else {
      reviewStatus = "rejected";
    }
  } catch {
    checkCancellation();
    // A failed optional repair must not discard a usable first draft.
  }
  checkCancellation();
  if (options.acceptOutput && !options.acceptOutput(output)) {
    throw new Error("The heist does not satisfy the campaign's constraints.");
  }
  return { output, initial, reviewed, before, after, reviewStatus };
}

/** Buffered adapter over the same two-pass implementation used by streaming. */
export async function runHeistGeneration(
  prompt: HeistPrompt,
  send: (message: string) => Promise<string>,
  options: HeistGenerationOptions = {},
): Promise<HeistGenerationResult> {
  const stream = streamHeistGeneration(
    prompt,
    async function* (message) {
      yield { type: "complete", text: await send(message) };
    },
    options,
  );
  let next = await stream.next();
  while (!next.done) next = await stream.next();
  return next.value;
}

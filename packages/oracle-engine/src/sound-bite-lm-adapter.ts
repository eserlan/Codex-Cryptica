import type { TextGenerationService } from "schema";
import {
  SoundBiteGenerationError,
  SoundBiteContentPolicyError,
} from "./response-parser";

export interface SoundBiteLogger {
  log(msg: string, data?: unknown): void;
  warn(msg: string, data?: unknown): void;
  error(msg: string, data?: unknown): void;
}

// Patterns that indicate a model refusal rather than a valid transcript.
const CONTENT_POLICY_SIGNALS = [
  /i(?:'m| am) unable to (generate|create|produce|write)/i,
  /i can(?:'t| not) (generate|create|produce|write)/i,
  /i(?:'ll| will) not (generate|create|produce|write)/i,
  /not able to generate/i,
  /this (request|content) (violates|goes against)/i,
];

/**
 * Calls the text generation service, collects the streaming response, and
 * validates it for empty output and content-policy refusals.
 */
export async function callLM(
  textGeneration: TextGenerationService,
  apiKey: string,
  modelName: string,
  prompt: string,
  isDemoMode: boolean | undefined,
  logger: SoundBiteLogger,
): Promise<string> {
  let collected = "";
  let chunkCount = 0;

  logger.log(`[SoundBite] _callTextGeneration: invoking generateResponse…`);
  try {
    await textGeneration.generateResponse(
      apiKey,
      prompt,
      [],
      "",
      modelName,
      (partial) => {
        collected = partial;
        chunkCount++;
      },
      isDemoMode,
    );
  } catch (err) {
    logger.error(`[SoundBite] textGeneration.generateResponse threw`, err);
    throw err;
  }

  logger.log(
    `[SoundBite] generateResponse done — chunks=${chunkCount} totalChars=${collected.length}` +
      (collected.length
        ? ` first100="${collected.slice(0, 100)}"`
        : " (empty response)"),
  );

  if (!collected.trim()) {
    logger.error(`[SoundBite] empty response from model`);
    throw new SoundBiteGenerationError(
      "Empty response from model. Please try again.",
    );
  }

  const matched = CONTENT_POLICY_SIGNALS.find((pattern) =>
    pattern.test(collected),
  );
  if (matched) {
    logger.warn(`[SoundBite] content policy signal detected: ${matched}`);
    throw new SoundBiteContentPolicyError();
  }

  return collected;
}

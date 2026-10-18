import { parseStatBlockReadResponse } from "./parse-response";
import { prepareStatBlockSource, assertSourceLength } from "./source";
import { StatBlockReadError } from "./errors";
import { buildStatBlockReadPrompt } from "./prompt";
import type { ImportRequest, ReadResult } from "./types";

/** Injected AI access. The web app adapts ProxyAIGeneratorGateway to this. */
export interface StatBlockReaderGateway {
  complete(
    prompt: string,
    systemInstruction: string,
    options: {
      generationConfig: Record<string, unknown>;
      signal?: AbortSignal;
    },
  ): Promise<string>;
}

/** The GM should not wait on a read longer than this (research R14). */
export const STAT_BLOCK_READ_TIMEOUT_MS = 30_000;

/** Low temperature and JSON output: transcription must be repeatable. */
export const STAT_BLOCK_GENERATION_CONFIG = {
  temperature: 0.1,
  topP: 0.9,
  maxOutputTokens: 4096,
  responseMimeType: "application/json",
};

/**
 * One-shot AI read. The pasted text is sent for this request only; the gateway
 * must not store the conversation (FR-021).
 */
export async function readStatBlockWithAi(
  request: ImportRequest,
  gateway: StatBlockReaderGateway,
  options: { signal?: AbortSignal } = {},
): Promise<ReadResult> {
  const source = prepareStatBlockSource(request.source);
  assertSourceLength(source);
  const prepared: ImportRequest = { ...request, source };
  const { systemInstruction, prompt } = buildStatBlockReadPrompt(prepared);

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, STAT_BLOCK_READ_TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  options.signal?.addEventListener("abort", forwardAbort);

  let text: string;
  try {
    text = await gateway.complete(prompt, systemInstruction, {
      generationConfig: STAT_BLOCK_GENERATION_CONFIG,
      signal: controller.signal,
    });
  } catch (error) {
    if (timedOut) throw new StatBlockReadError("timeout");
    const message = error instanceof Error ? error.message : undefined;
    throw new StatBlockReadError("gateway", message);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", forwardAbort);
  }

  return parseStatBlockReadResponse(text, prepared);
}

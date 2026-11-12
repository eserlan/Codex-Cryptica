import { detectHiddenTextLeakage } from "@codex/adventure-engine";
import type { AdventureTurnGenerationRequest } from "./adventure-generation.types";

/**
 * Preview only the first top-level narration string in a structured JSON
 * response. This intentionally refuses nested fields and GM-only JSON.
 * Final JSON validation and the turn guard still run at commit; this also
 * checks each preview against the session's unrevealed secrets.
 */
export function extractAdventureNarrationPrefix(buffer: string): string {
  // Require the first top-level fields to be kind and narration. Never show
  // a private hidden-state field as a partial player preview.
  const pattern =
    /^\s*\{\s*"kind"\s*:\s*"(?:complete|roll-required)"\s*,\s*"(?:narration|setupNarration)"\s*:\s*"((?:[^"\\]|\\["\\/bfnrt]|\\u[0-9a-fA-F]{4})*)/;
  const match = pattern.exec(buffer);
  if (!match) return "";
  try {
    return (JSON.parse('"' + match[1] + '"') as string).slice(0, 2_000);
  } catch {
    return "";
  }
}

export type AdventureStreamEvent =
  | { type: "started" }
  | { type: "delta"; text: string }
  | { type: "complete"; text: string }
  | { type: "error"; error: string };

export type AdventureStream =
  | AsyncIterable<AdventureStreamEvent>
  | {
      stream: AsyncIterable<{ text(): string }>;
      response: Promise<{ text(): string }>;
    };

export function streamAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
}

async function collectEventStream(
  source: AsyncIterable<AdventureStreamEvent>,
  publish: (buffer: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  let buffer = "";
  for await (const event of source) {
    streamAborted(signal);
    if (event.type === "delta") buffer += event.text;
    if (event.type === "complete") buffer = event.text || buffer;
    if (event.type === "error") throw new Error(event.error);
    publish(buffer);
  }
  streamAborted(signal);
  return buffer;
}

async function collectSdkStream(
  source: Exclude<AdventureStream, AsyncIterable<AdventureStreamEvent>>,
  publish: (buffer: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  let buffer = "";
  for await (const chunk of source.stream) {
    streamAborted(signal);
    buffer += chunk.text();
    publish(buffer);
  }
  const response = await source.response;
  streamAborted(signal);
  return response.text() || buffer;
}

export function collectAdventureStream(
  source: AdventureStream,
  publish: (buffer: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  return Symbol.asyncIterator in source
    ? collectEventStream(source, publish, signal)
    : collectSdkStream(source, publish, signal);
}

export function publishAdventureNarration(
  request: AdventureTurnGenerationRequest,
  buffer: string,
  signal?: AbortSignal,
): void {
  if (signal?.aborted) return;
  const narration = extractAdventureNarrationPrefix(buffer);
  if (
    narration &&
    detectHiddenTextLeakage(request.session, narration).length === 0
  ) {
    request.onNarration?.(narration);
  }
}

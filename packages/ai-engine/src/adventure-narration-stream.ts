import {
  detectHiddenTextLeakage,
  type PreviewLeakageContext,
} from "@codex/adventure-engine";
import type { AdventureTurnGenerationRequest } from "./adventure-generation.types";

const MAX_NARRATION_PREVIEW_CHARS = 2_000;

export interface SafeNarrationState {
  ready: boolean;
  narration: string;
  previewContext: PreviewLeakageContext;
}

function skipWhitespace(input: string, start: number): number {
  let i = start;
  while (i < input.length && /\s/.test(input[i]!)) i += 1;
  return i;
}

function skipLeadingJsonFence(input: string): number {
  let i = skipWhitespace(input, 0);
  if (input.startsWith("```", i)) {
    const newline = input.indexOf("\n", i + 3);
    if (newline === -1) return input.length;
    i = skipWhitespace(input, newline + 1);
  }
  return i;
}

function decodeJsonStringLiteral(
  slice: string,
  maxDecodedChars: number,
): string | null {
  try {
    const text = JSON.parse(slice) as string;
    return maxDecodedChars < Infinity ? text.slice(0, maxDecodedChars) : text;
  } catch {
    return null;
  }
}

function advanceEscape(input: string, slashIndex: number): number | null {
  if (slashIndex + 1 >= input.length) return null;
  if (input[slashIndex + 1] !== "u") return slashIndex + 2;
  return slashIndex + 5 >= input.length ? null : slashIndex + 6;
}

/**
 * Decodes a JSON string literal starting at `quoteIndex` (which must be `"`).
 * Returns `complete: false` if the closing quote has not arrived yet, along with
 * the safely decoded prefix up to any incomplete trailing escape sequence.
 */
function scanJsonString(
  input: string,
  quoteIndex: number,
  maxDecodedChars = Infinity,
): { text: string; complete: boolean; nextIndex: number } {
  let i = quoteIndex + 1;
  let safeEnd = i;
  while (i < input.length) {
    const ch = input[i]!;
    if (ch === '"') {
      const text = decodeJsonStringLiteral(
        input.slice(quoteIndex, i + 1),
        maxDecodedChars,
      );
      return text !== null
        ? { text, complete: true, nextIndex: i + 1 }
        : { text: "", complete: false, nextIndex: input.length };
    }
    const next = ch === "\\" ? advanceEscape(input, i) : i + 1;
    if (next === null) break;
    i = next;
    safeEnd = i;
  }
  const prefix = decodeJsonStringLiteral(
    `${input.slice(quoteIndex, safeEnd)}"`,
    maxDecodedChars,
  );
  return {
    text: prefix ?? "",
    complete: false,
    nextIndex: input.length,
  };
}

function findCompoundValueEnd(input: string, start: number): number | null {
  let depth = 0;
  let i = start;
  while (i < input.length) {
    const ch = input[i]!;
    if (ch === '"') {
      const scanned = scanJsonString(input, i);
      if (!scanned.complete) return null;
      i = scanned.nextIndex;
      continue;
    }
    if (ch === "{" || ch === "[") depth += 1;
    else if (ch === "}" || ch === "]") {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
    i += 1;
  }
  return null;
}

/** Finds the end index (exclusive) of a complete JSON value starting at `start`. */
function findJsonValueEnd(input: string, start: number): number | null {
  const first = input[start];
  if (!first) return null;
  if (first === '"') {
    const scanned = scanJsonString(input, start);
    return scanned.complete ? scanned.nextIndex : null;
  }
  if (first === "{" || first === "[") {
    return findCompoundValueEnd(input, start);
  }
  let i = start;
  while (i < input.length && !/[\s,}]/.test(input[i]!)) i += 1;
  return i < input.length ? i : null;
}

interface ParsedPrefixMetadata {
  kind?: string;
  hasHiddenPatch: boolean;
  previewContext: PreviewLeakageContext;
}

const METADATA_RECORDERS: Record<
  string,
  (parsed: unknown, meta: ParsedPrefixMetadata) => void
> = {
  kind: (parsed, meta) => {
    if (typeof parsed === "string") meta.kind = parsed;
  },
  hiddenPatch: (parsed, meta) => {
    if (parsed && typeof parsed === "object") {
      meta.hasHiddenPatch = true;
      meta.previewContext.hiddenPatch =
        parsed as PreviewLeakageContext["hiddenPatch"];
    }
  },
  revealSecretIds: (parsed, meta) => {
    if (Array.isArray(parsed)) {
      meta.previewContext.revealSecretIds = parsed.filter(
        (item): item is string => typeof item === "string",
      );
    }
  },
  packageEvents: (parsed, meta) => {
    if (Array.isArray(parsed)) {
      meta.previewContext.packageEvents =
        parsed as PreviewLeakageContext["packageEvents"];
    }
  },
  actorEvents: (parsed, meta) => {
    if (Array.isArray(parsed)) {
      meta.previewContext.actorEvents =
        parsed as PreviewLeakageContext["actorEvents"];
    }
  },
};

function recordPrefixMetadata(
  key: string,
  parsed: unknown,
  meta: ParsedPrefixMetadata,
): void {
  METADATA_RECORDERS[key]?.(parsed, meta);
}

function readNextProperty(
  buffer: string,
  start: number,
): { key: string; valueIndex: number } | null {
  let i = skipWhitespace(buffer, start);
  if (buffer[i] === ",") i = skipWhitespace(buffer, i + 1);
  if (i >= buffer.length || buffer[i] !== '"') return null;
  const keyScan = scanJsonString(buffer, i);
  if (!keyScan.complete) return null;
  i = skipWhitespace(buffer, keyScan.nextIndex);
  if (buffer[i] !== ":") return null;
  const valueIndex = skipWhitespace(buffer, i + 1);
  return valueIndex < buffer.length ? { key: keyScan.text, valueIndex } : null;
}

function isNarrationKeyReady(key: string, meta: ParsedPrefixMetadata): boolean {
  if (key === "narration") {
    return meta.kind === "complete" && meta.hasHiddenPatch;
  }
  if (key === "setupNarration") {
    return meta.kind === "roll-required";
  }
  return false;
}

/**
 * Extracts progressive narration only after leading secrecy metadata is complete:
 * - For `complete` turns: `kind` and `hiddenPatch` must be completely parsed before
 *   top-level `narration` can emit.
 * - For `roll-required` turns: `kind` must be parsed before `setupNarration` can emit.
 * Falls back to `{ ready: false, narration: "" }` if `narration` precedes `hiddenPatch`.
 */
export function extractSafeNarrationState(buffer: string): SafeNarrationState {
  const meta: ParsedPrefixMetadata = {
    hasHiddenPatch: false,
    previewContext: {},
  };
  let i = skipLeadingJsonFence(buffer);
  if (buffer[i] !== "{") {
    return { ready: false, narration: "", previewContext: meta.previewContext };
  }
  i += 1;

  while (i < buffer.length) {
    const prop = readNextProperty(buffer, i);
    if (!prop) break;
    if (prop.key === "narration" || prop.key === "setupNarration") {
      if (
        !isNarrationKeyReady(prop.key, meta) ||
        buffer[prop.valueIndex] !== '"'
      ) {
        return {
          ready: false,
          narration: "",
          previewContext: meta.previewContext,
        };
      }
      const val = scanJsonString(
        buffer,
        prop.valueIndex,
        MAX_NARRATION_PREVIEW_CHARS,
      );
      return {
        ready: true,
        narration: val.text,
        previewContext: meta.previewContext,
      };
    }

    const valueEnd = findJsonValueEnd(buffer, prop.valueIndex);
    if (valueEnd === null) break;
    try {
      recordPrefixMetadata(
        prop.key,
        JSON.parse(buffer.slice(prop.valueIndex, valueEnd)),
        meta,
      );
    } catch {
      return {
        ready: false,
        narration: "",
        previewContext: meta.previewContext,
      };
    }
    i = valueEnd;
  }

  return { ready: false, narration: "", previewContext: meta.previewContext };
}

/**
 * Publishes progressive narration previews only after leading turn metadata is
 * parsed and the preview passes both session and same-turn leakage screening.
 */
export function createNarrationPreviewPublisher(
  request: AdventureTurnGenerationRequest,
): (buffer: string) => void {
  const onNarration = request.onNarration;
  if (!onNarration) return () => {};
  let suppressed = false;
  let lastPublished = "";
  return (buffer: string) => {
    if (suppressed) return;
    const state = extractSafeNarrationState(buffer);
    if (!state.ready || !state.narration || state.narration === lastPublished) {
      return;
    }
    const findings = detectHiddenTextLeakage(
      request.session,
      state.narration,
      state.previewContext,
    );
    if (findings.length > 0) {
      suppressed = true;
      if (lastPublished !== "") {
        lastPublished = "";
        onNarration("");
      }
      return;
    }
    lastPublished = state.narration;
    onNarration(state.narration);
  };
}

/**
 * Decode a top-level narration prefix for diagnostics only. It is NOT a safe
 * player-facing preview: the remainder of the proposal may introduce hidden
 * facts not yet present in the session, so the guard cannot check this prefix.
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

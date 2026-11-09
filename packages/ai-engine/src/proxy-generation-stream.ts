import { buildOperationPipelineBody } from "./generation-request";
import { formatErrorCode, postProxyJson } from "./proxy-http";
import { parseSseData, readSseFrames } from "./proxy-sse";

/** Structural match for oracle-proxy's provider-neutral GenerationEvent. */
export type GenerationEvent =
  | { type: "started" }
  | { type: "delta"; text: string }
  | {
      type: "complete";
      text: string;
      usage?: { promptTokens: number; completionTokens: number };
    }
  | { type: "error"; error: string };

function streamFailure(err: unknown, fallback: string): GenerationEvent {
  const isAbort = (err as { name?: string } | undefined)?.name === "AbortError";
  return { type: "error", error: isAbort ? "aborted" : fallback };
}

async function upstreamError(response: Response): Promise<string> {
  let message = `upstream-status-${response.status}`;
  try {
    const body = await response.json();
    if (body?.error?.message) {
      // Keep machine-readable codes available to classifyApiError.
      message = `${body.error.message}${formatErrorCode(body.error?.code)}`;
    }
  } catch {
    // A missing or non-JSON body keeps the status-based message.
  }
  return message;
}

function* generationEvents(raw: string): Generator<GenerationEvent> {
  for (const event of parseSseData(raw, true)) {
    try {
      if (import.meta.env.DEV) {
        console.debug("[Generator stream] SSE event received", {
          type: event.type,
          textLength: event.type === "delta" ? event.text.length : undefined,
        });
      }
      yield event;
    } catch {
      // Preserve the tolerant operation-stream parser for malformed payloads.
    }
  }
}

function logNetworkChunk(value: Uint8Array): void {
  if (import.meta.env.DEV) {
    console.debug("[Generator stream] SSE network chunk received", {
      byteLength: value.byteLength,
    });
  }
}

/** Stream the same operation body as buffered generation, plus stream:true. */
export async function* sendViaOperationPipelineStream(params: {
  proxyUrl: string;
  doFetch: typeof fetch;
  contents: any[];
  generationConfig: any;
  finalSysInst?: string;
  signal?: AbortSignal;
}): AsyncGenerator<GenerationEvent> {
  const body = { ...buildOperationPipelineBody(params), stream: true };
  if (import.meta.env.DEV)
    console.debug("[Generator stream] opening SSE request");
  let response: Response;
  try {
    response = await postProxyJson(
      params.doFetch,
      params.proxyUrl,
      body,
      params.signal,
    );
  } catch (err) {
    yield streamFailure(err, "transport-error");
    return;
  }
  if (!response.ok || !response.body) {
    yield { type: "error", error: await upstreamError(response) };
    return;
  }
  if (import.meta.env.DEV) {
    console.debug("[Generator stream] SSE response opened", {
      contentType: response.headers.get("content-type"),
    });
  }
  const reader = response.body.getReader();
  try {
    for await (const { raw } of readSseFrames(reader, logNetworkChunk)) {
      yield* generationEvents(raw);
    }
  } catch (err) {
    // Never reconnect after yielding content: replay would duplicate output.
    yield streamFailure(err, "stream-read-error");
  }
}

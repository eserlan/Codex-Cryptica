import { AuthenticatedProxy } from "./authenticated-proxy";
import { ProxyInteractions } from "./proxy-interactions";
import { formatErrorCode } from "./proxy-http";
// fallow-ignore-file code-duplication -- Legacy provider/worker forwarding boilerplate is intentionally retained while the conversation migration is validated; extract shared paths separately.
import type {
  GoogleGenerativeAI as GoogleGenerativeAIType,
  GenerativeModel,
} from "@google/generative-ai";
import {
  buildOperationPipelineBody,
  normalizeGenerateContentRequest,
} from "./generation-request";
import type { SessionTokenSource } from "./session-manager";

export {
  InteractionExpiredError,
  INTERACTION_MODEL_KEY,
  GENERATOR_INTERACTION_MODEL_KEY,
} from "./proxy-interactions";

/**
 * Sends a plain-text generateContent request through oracle-proxy's
 * provider-neutral operation pipeline (specs/153-llm-model-registry)
 * instead of the legacy Gemini-only `contents`/`generationConfig` shape.
 * The Worker resolves the actual model via its registry — no model name is
 * sent, per
 * that pipeline's contract. Returns a response shaped like the Google SDK's
 * `GenerativeModel.generateContent()` result so callers see no interface
 * change.
 */
/**
 * Provider-neutral streaming event contract (#2423), mirrored from
 * oracle-proxy's `GenerationEvent` (apps/workers/oracle-proxy/src/llm/types.ts)
 * — the two are never imported across the client/Worker boundary (no shared
 * package), so this is a structural, not nominal, match kept in sync by hand.
 */
export type GenerationEvent =
  | { type: "started" }
  | { type: "delta"; text: string }
  | {
      type: "complete";
      text: string;
      usage?: { promptTokens: number; completionTokens: number };
    }
  | { type: "error"; error: string };

// fallow-ignore-next-line complexity -- Adapter orchestration and structured event paths are covered by focused provider/turn tests.
async function sendViaOperationPipeline(params: {
  proxyUrl: string;
  doFetch: typeof fetch;
  contents: any[];
  generationConfig: any;
  finalSysInst?: string;
  modelName: string;
  signal?: AbortSignal;
}) {
  const {
    proxyUrl,
    doFetch,
    contents,
    generationConfig,
    finalSysInst,
    modelName,
    signal,
  } = params;

  const body = buildOperationPipelineBody({
    contents,
    generationConfig,
    finalSysInst,
  });

  console.log(`[OracleProxy] Fetching from: ${proxyUrl} (operation pipeline)`);
  if (import.meta.env.DEV) {
    // The legacy `modelName` hint is never the model that actually serves
    // this request (the registry decides that server-side) — keep it out of
    // the always-on log so it can't read as a claim about which model ran;
    // it's only useful in DEV as a "what did the caller ask for" trace.
    console.log(
      `[OracleProxy] Legacy model hint (ignored by pipeline): ${modelName}`,
    );
  }
  const response = await doFetch(proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  console.log(
    `[OracleProxy] Response status: ${response.status} ${response.statusText}`,
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: { message: "Proxy request failed" },
    }));
    console.error("[OracleProxy] Request failed:", error);
    throw new Error(
      `[OracleProxy] Request failed: ${error.error?.message || "Unknown error"}${formatErrorCode(error.error?.code)}`,
    );
  }

  const data = await response.json();
  // The registry — not the legacy `modelName` hint logged above — decides
  // the real model for this request; always log which one it actually
  // picked (not just in DEV) so this doesn't require reading the raw
  // response to answer "which model served this?".
  console.log(`[OracleProxy] Resolved model: ${data.modelKey ?? "unknown"}`);
  if (import.meta.env.DEV) {
    console.log("[OracleProxy] Received raw data (operation pipeline):", data);
  }

  const extractedText =
    typeof data.content === "string"
      ? data.content
      : data.content !== undefined
        ? JSON.stringify(data.content)
        : "";

  if (import.meta.env.DEV) {
    console.log(
      `[OracleProxy] Extracted text (${extractedText.length} chars):`,
      extractedText.substring(0, 50) + "...",
    );
  }

  // Reconstruct a Gemini-SDK-shaped candidates array so callers reading
  // `response.candidates` directly (not just `response.text()`) keep working.
  const candidates = [{ content: { parts: [{ text: extractedText }] } }];

  return {
    response: {
      text: () => extractedText,
      candidates,
    },
    rawResponse: data,
  };
}

/**
 * Streaming counterpart to `sendViaOperationPipeline` (#2423). Same body as
 * the buffered call, plus `stream: true`, reading oracle-proxy's SSE
 * response and re-emitting each `GenerationEvent` as it arrives. No
 * 401-retry-with-fresh-token here — see `proxyFetch`'s doc comment; a token
 * expiring mid-stream surfaces as an `error` event rather than a silent
 * reconnect, since replaying a request that's already streamed content to
 * the caller isn't safe to do transparently.
 */
// fallow-ignore-next-line complexity
async function* sendViaOperationPipelineStream(params: {
  proxyUrl: string;
  doFetch: typeof fetch;
  contents: any[];
  generationConfig: any;
  finalSysInst?: string;
  signal?: AbortSignal;
}): AsyncGenerator<GenerationEvent> {
  const {
    proxyUrl,
    doFetch,
    contents,
    generationConfig,
    finalSysInst,
    signal,
  } = params;

  const body = {
    ...buildOperationPipelineBody({ contents, generationConfig, finalSysInst }),
    stream: true,
  };

  if (import.meta.env.DEV) {
    console.debug("[Generator stream] opening SSE request");
  }

  let response: Response;
  try {
    response = await doFetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    const isAbort =
      (err as { name?: string } | undefined)?.name === "AbortError";
    yield { type: "error", error: isAbort ? "aborted" : "transport-error" };
    return;
  }

  if (!response.ok || !response.body) {
    let message = `upstream-status-${response.status}`;
    try {
      const errorBody = await response.json();
      if (errorBody?.error?.message) {
        // Match the buffered path's message shape (`formatErrorCode`) — a
        // caller-side classifier (classifyApiError) pattern-matches the
        // trailing "(code: X)" to detect e.g. session-token expiry, and
        // needs to see it here too, not just on the non-streaming request.
        message = `${errorBody.error.message}${formatErrorCode(errorBody.error?.code)}`;
      }
    } catch {
      // Body wasn't JSON (or the stream never opened) — keep the status-based message.
    }
    yield { type: "error", error: message };
    return;
  }

  if (import.meta.env.DEV) {
    console.debug("[Generator stream] SSE response opened", {
      contentType: response.headers.get("content-type"),
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // Parses the `data:` lines out of one raw SSE event and yields each as a
  // GenerationEvent, skipping (not throwing on) a malformed payload.
  function* parseSseEvent(rawEvent: string): Generator<GenerationEvent> {
    for (const line of rawEvent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const dataStr = trimmed.slice(5).trim();
      if (!dataStr) continue;
      try {
        const event = JSON.parse(dataStr) as GenerationEvent;
        if (import.meta.env.DEV) {
          console.debug("[Generator stream] SSE event received", {
            type: event.type,
            textLength: event.type === "delta" ? event.text.length : undefined,
          });
        }
        yield event;
      } catch {
        // Skip a malformed SSE payload rather than aborting the stream.
      }
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (import.meta.env.DEV) {
        console.debug("[Generator stream] SSE network chunk received", {
          byteLength: value.byteLength,
        });
      }
      buffer += decoder.decode(value, { stream: true });

      let sepIndex: number;
      while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);
        yield* parseSseEvent(rawEvent);
      }
    }

    // Flush any trailing partial event still buffered when the stream ends
    // without a final blank-line separator — a provider closing the
    // connection right after its last chunk shouldn't silently drop it.
    buffer += decoder.decode();
    if (buffer.trim()) yield* parseSseEvent(buffer);
  } catch (err) {
    const isAbort =
      (err as { name?: string } | undefined)?.name === "AbortError";
    yield { type: "error", error: isAbort ? "aborted" : "stream-read-error" };
  }
}

/**
 * DefaultAIClientManager manages connections to Google's Generative AI service.
 */
export class DefaultAIClientManager {
  private client: GoogleGenerativeAIType | null = null;
  private currentKey: string | null = null;
  private sdkPromise: Promise<typeof import("@google/generative-ai")> | null =
    null;

  // Proxy configuration
  private static get PROXY_URL() {
    return (
      (typeof import.meta !== "undefined" &&
        import.meta.env?.VITE_ORACLE_PROXY_URL) ||
      "https://oracle-proxy.espen-erlandsen.workers.dev"
    );
  }

  private proxy: AuthenticatedProxy;

  constructor(
    fetcher: typeof fetch = (input, init) => fetch(input, init),
    sessionManager: SessionTokenSource | null = null,
  ) {
    this.proxy = new AuthenticatedProxy(fetcher, sessionManager);
  }

  /** Wired at app startup, when the challenge solver has access to the DOM. */
  setSessionManager(sessionManager: SessionTokenSource | null): void {
    this.proxy.setSessionManager(sessionManager);
  }

  async sendInteraction(params: Parameters<ProxyInteractions["send"]>[0]) {
    return new ProxyInteractions(
      DefaultAIClientManager.PROXY_URL,
      this.proxy.fetch,
    ).send(params);
  }

  async *sendInteractionStream(
    params: Parameters<ProxyInteractions["stream"]>[0],
  ) {
    yield* new ProxyInteractions(
      DefaultAIClientManager.PROXY_URL,
      this.proxy.fetch,
    ).stream(params);
  }

  /**
   * Lazy-loads the @google/generative-ai SDK.
   */
  private async ensureSdk() {
    if (!this.sdkPromise) {
      this.sdkPromise = import("@google/generative-ai");
    }
    return this.sdkPromise;
  }

  /**
   * Gets or creates a GoogleGenerativeAI client instance for the given API key.
   */
  async getClient(apiKey: string): Promise<GoogleGenerativeAIType> {
    if (!this.client || this.currentKey !== apiKey) {
      const { GoogleGenerativeAI } = await this.ensureSdk();
      this.client = new GoogleGenerativeAI(apiKey);
      this.currentKey = apiKey;
    }
    return this.client;
  }

  /**
   * Gets a GenerativeModel instance for text generation.
   */
  async getModel(
    apiKey: string,
    modelName: string,
    systemInstruction?: string,
  ): Promise<GenerativeModel> {
    // If no API key, use proxy path
    if (!apiKey) {
      return this.createProxyModel(modelName, systemInstruction);
    }

    // User has API key - use direct path (Custom Key mode)
    const client = await this.getClient(apiKey);
    return client.getGenerativeModel({
      model: modelName,
      systemInstruction,
    });
  }

  /**
   * Create a proxy-backed model that forwards requests to the Cloudflare Worker.
   */
  private createProxyModel(
    modelName: string,
    systemInstruction?: string,
  ): GenerativeModel {
    const proxyUrl = DefaultAIClientManager.PROXY_URL;
    // The session-aware wrapper, not the raw fetcher: this callback is what
    // both the operation pipeline and the legacy passthrough below use to
    // reach the proxy, so it must carry the capability token.
    const doFetch = this.proxy.fetch;

    return {
      model: modelName,
      systemInstruction,

      startChat: (options: any = {}) => {
        // Mutated in place as turns are sent, mirroring the real SDK's
        // ChatSession: each call on the same session sees every prior
        // exchange, not just what was passed to startChat() itself.
        const history = [...(options.history || [])];
        const model = this.createProxyModel(modelName, systemInstruction);

        return {
          sendMessageStream: async (
            query: string,
            requestOptions?: { signal?: AbortSignal },
          ) => {
            const contents = [
              ...history,
              { role: "user", parts: [{ text: query }] },
            ];

            const result = await (model as any).generateContent(
              { contents },
              requestOptions,
            );

            const responseText = result.response.text();
            history.push(
              { role: "user", parts: [{ text: query }] },
              { role: "model", parts: [{ text: responseText }] },
            );

            return {
              stream: (async function* () {
                yield {
                  text: () => responseText,
                };
              })(),
            };
          },
        };
      },

      // fallow-ignore-next-line complexity
      async generateContent(
        request: any,
        requestOptions?: { signal?: AbortSignal },
      ) {
        const { signal } = requestOptions ?? {};
        // Model logging happens further down, once we know which path this
        // request takes: the operation pipeline (the common case) resolves
        // its own model server-side via the registry and only ever treats
        // `modelName` as a legacy hint (see sendViaOperationPipeline's own
        // log) — logging it here unqualified, before that's known, reads as
        // the actual model in use when it may not be.
        const { contents, generationConfig, finalSysInst, isPlainTextRequest } =
          normalizeGenerateContentRequest(request, systemInstruction);

        try {
          if (isPlainTextRequest) {
            return await sendViaOperationPipeline({
              proxyUrl,
              doFetch,
              contents,
              generationConfig,
              finalSysInst,
              modelName,
              signal,
            });
          }

          const body = {
            model: modelName,
            contents,
            system_instruction: finalSysInst
              ? { parts: [{ text: finalSysInst }] }
              : undefined,
            generationConfig,
          };

          // Legacy passthrough (non-text content/output — the operation
          // pipeline only handles plain text): `modelName` genuinely is the
          // model that will serve this request, unlike the pipeline path.
          console.log(
            `[OracleProxy] Fetching from: ${proxyUrl} (legacy passthrough, model: ${modelName})`,
          );
          const response = await doFetch(proxyUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            signal,
          });

          console.log(
            `[OracleProxy] Response status: ${response.status} ${response.statusText}`,
          );

          if (!response.ok) {
            const error = await response.json().catch(() => ({
              error: { message: "Proxy request failed" },
            }));
            console.error("[OracleProxy] Request failed:", error);
            throw new Error(
              `[OracleProxy] Request failed: ${error.error?.message || "Unknown error"}${formatErrorCode(error.error?.code)}`,
            );
          }

          const data = await response.json();
          if (import.meta.env.DEV) {
            console.log("[OracleProxy] Received raw data:", data);
          }

          // Support for both text and image modalities by providing a safe text() helper
          // but always passing the full rawResponse for modality-specific services.
          const candidates = data.candidates || [];
          const firstCandidate = candidates[0];
          const parts = firstCandidate?.content?.parts || [];

          // Join all text parts (some models might return thoughts or multiple text parts)
          const extractedText = parts
            .map((p: any) => p.text || "")
            .filter(Boolean)
            .join("");

          if (import.meta.env.DEV) {
            console.log(
              `[OracleProxy] Extracted text (${extractedText.length} chars):`,
              extractedText.substring(0, 50) + "...",
            );
          }

          return {
            response: {
              text: () => extractedText,
              candidates,
            },
            rawResponse: data,
          };
        } catch (err) {
          console.error("[OracleProxy] Fetch error:", err);
          throw err;
        }
      },

      /**
       * Streaming counterpart to `generateContent` (#2423). Only the
       * operation-pipeline (plain-text) path supports streaming — a request
       * needing the legacy passthrough (non-text modalities) yields a single
       * `error` event instead, so callers that don't check first still fail
       * safely rather than getting bytes that skip the pipeline entirely.
       */
      generateContentStream(
        request: any,
        signal?: AbortSignal,
      ): AsyncGenerator<GenerationEvent> {
        const { contents, generationConfig, finalSysInst, isPlainTextRequest } =
          normalizeGenerateContentRequest(request, systemInstruction);

        if (!isPlainTextRequest) {
          return (async function* () {
            yield {
              type: "error",
              error: "streaming-not-supported-for-non-text-request",
            } as GenerationEvent;
          })();
        }

        return sendViaOperationPipelineStream({
          proxyUrl,
          doFetch,
          contents,
          generationConfig,
          finalSysInst,
          signal,
        });
      },
    } as unknown as GenerativeModel;
  }
}

export const aiClientManager = new DefaultAIClientManager();

import type {
  GoogleGenerativeAI as GoogleGenerativeAIType,
  GenerativeModel,
  GenerativeContentBlob,
} from "@google/generative-ai";
import { safeSnapshot } from "./text-generation-context";
import type { SessionTokenSource } from "./session-manager";

/**
 * Thrown when a `previous_interaction_id` is no longer valid (retention window
 * elapsed). The caller should reset interaction state and replay full history.
 */
export class InteractionExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InteractionExpiredError";
  }
}

/**
 * Registry key used for server-side turn state (Interactions path).
 * oracle-proxy's `handleInteraction` resolves this via the model registry, so
 * it's provider-neutral on the wire — chat/revision/generator sessions all
 * thread this same key regardless of the caller's Gemini model-tier setting.
 */
export const INTERACTION_MODEL_KEY = "luna-fast";

/**
 * Named separately so generator callers can retain an explicit model choice
 * in their request shape while sharing the same Luna conversation route as
 * Oracle chat and entity revision.
 *
 * oracle-proxy's `handleInteraction` branches on the resolved model's
 * provider, so a Gemini key here routes to Gemini's Interactions API — the
 * original path, with the OpenAI Responses branch added alongside it later.
 */
export const GENERATOR_INTERACTION_MODEL_KEY = INTERACTION_MODEL_KEY;

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

/** Shared by `sendViaOperationPipeline` and its streaming counterpart so a
 * buffered and a streamed request for the same content always ask the
 * operation pipeline for exactly the same thing. */
function buildOperationPipelineBody(params: {
  contents: any[];
  generationConfig: any;
  finalSysInst?: string;
}): Record<string, unknown> {
  const { contents, generationConfig, finalSysInst } = params;

  const messages: Array<{ role: string; content: string }> = [];
  if (finalSysInst) {
    messages.push({ role: "system", content: finalSysInst });
  }
  for (const c of contents) {
    const text = (c.parts || [])
      .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
      .join("");
    messages.push({
      role: c.role === "model" ? "assistant" : "user",
      content: text,
    });
  }

  const wantsJson =
    generationConfig?.responseMimeType === "application/json" ||
    generationConfig?.response_mime_type === "application/json";

  const body: Record<string, unknown> = {
    operation: wantsJson ? "structured-generation" : "freeform-generation",
    messages,
  };
  const responseSchema =
    generationConfig?.responseSchema ?? generationConfig?.response_schema;
  if (responseSchema !== undefined) {
    // Forwarding a schema does double duty: it lets oracle-proxy actually
    // validate the parsed response shape (structuredOutputValid otherwise
    // defaults to true with nothing to check), and for OpenAI-family models
    // it switches them from json_object mode — which can only ever return a
    // JSON *object* at the root, never a bare array — to json_schema mode,
    // which can. Callers requesting a top-level array without a schema will
    // silently get an object-shaped refusal from those providers.
    body.schema = responseSchema;
  }
  if (generationConfig?.temperature !== undefined) {
    body.temperature = generationConfig.temperature;
  }
  const topP = generationConfig?.topP ?? generationConfig?.top_p;
  if (topP !== undefined) body.topP = topP;
  const maxOutputTokens =
    generationConfig?.maxOutputTokens ?? generationConfig?.max_output_tokens;
  if (maxOutputTokens !== undefined) body.maxOutputTokens = maxOutputTokens;

  return body;
}

async function sendViaOperationPipeline(params: {
  proxyUrl: string;
  doFetch: typeof fetch;
  contents: any[];
  generationConfig: any;
  finalSysInst?: string;
  modelName: string;
}) {
  const {
    proxyUrl,
    doFetch,
    contents,
    generationConfig,
    finalSysInst,
    modelName,
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
 * Normalizes a `generateContent`/`generateContentStream` request (a bare
 * string, a parts array, a single content object, or a full request object)
 * into the shape both the operation pipeline and the legacy passthrough
 * expect. Shared so a streamed and a buffered call for the same input always
 * produce identical `contents`/`generationConfig`/`finalSysInst` — only how
 * the response comes back differs.
 */
function normalizeGenerateContentRequest(
  request: string | Array<GenerativeContentBlob | string> | any,
  systemInstruction: string | undefined,
): {
  contents: any[];
  generationConfig: any;
  finalSysInst: string | undefined;
  isPlainTextRequest: boolean;
} {
  // Deep clone request data so any reactive proxies are removed before the
  // payload is normalized and serialized.
  const raw = safeSnapshot(request);

  let contents: any[];
  let generationConfig: any = {};

  if (
    raw &&
    typeof raw === "object" &&
    raw.contents &&
    Array.isArray(raw.contents)
  ) {
    // It's a full request object
    contents = raw.contents;
    generationConfig = raw.generationConfig || raw.generation_config || {};
  } else if (Array.isArray(raw)) {
    // It's an array of parts
    contents = [
      {
        role: "user",
        parts: raw.map((p) => (typeof p === "string" ? { text: p } : p)),
      },
    ];
  } else if (raw && typeof raw === "object" && raw.parts) {
    // It's a single content object
    contents = [raw];
  } else {
    // It's a simple string
    contents = [{ role: "user", parts: [{ text: String(raw) }] }];
  }

  // Final sanitation of parts (crucial for scalar field error)
  contents = contents.map((c) => ({
    role: c.role || "user",
    parts: (c.parts || []).map((p: any) => {
      // Ensure part is an object, and if text is an object, extract its string
      if (typeof p === "string") return { text: p };
      if (p.text && typeof p.text !== "string") {
        console.warn(
          "[OracleProxy] Sanitizing object found in text field:",
          p.text,
        );
        return { text: String(p.text) };
      }
      return p;
    }),
  }));

  const requestSysInst = raw?.systemInstruction ?? raw?.system_instruction;
  const finalSysInst =
    systemInstruction ??
    (typeof requestSysInst === "string"
      ? requestSysInst
      : requestSysInst?.parts?.[0]?.text);

  // Non-text response modalities (e.g. inline image generation via Gemini's
  // multimodal endpoint) and non-text input parts (e.g. an inlineData image
  // sent as part of the prompt) have no equivalent in the operation-based
  // pipeline, which only ever deals in plain text messages both directions.
  // Those requests keep using the legacy passthrough; only plain-text
  // requests route through the registry/resolver pipeline (streaming or not).
  const modalities: string[] =
    generationConfig?.responseModalities ??
    generationConfig?.response_modalities ??
    [];
  const wantsNonTextOutput =
    modalities.length > 0 &&
    !(modalities.length === 1 && modalities[0] === "TEXT");
  const hasNonTextInput = contents.some((c) =>
    (c.parts || []).some((p: any) => !p || typeof p.text !== "string"),
  );
  const isPlainTextRequest = !wantsNonTextOutput && !hasNonTextInput;

  return { contents, generationConfig, finalSysInst, isPlainTextRequest };
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
      if (errorBody?.error?.message) message = errorBody.error.message;
    } catch {
      // Body wasn't JSON (or the stream never opened) — keep the status-based message.
    }
    yield { type: "error", error: message };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sepIndex: number;
      while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);

        for (const line of rawEvent.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const dataStr = trimmed.slice(5).trim();
          if (!dataStr) continue;

          try {
            yield JSON.parse(dataStr) as GenerationEvent;
          } catch {
            // Skip a malformed SSE payload rather than aborting the stream.
          }
        }
      }
    }
  } catch (err) {
    const isAbort =
      (err as { name?: string } | undefined)?.name === "AbortError";
    yield { type: "error", error: isAbort ? "aborted" : "stream-read-error" };
  }
}

/**
 * Appends `(code: X)` to a thrown error message when the proxy supplied a
 * machine-readable error code, so `classifyApiError` can pattern-match on
 * it instead of the free-text message (which is prose meant for a human,
 * not a stable identifier).
 */
function formatErrorCode(code: unknown): string {
  return typeof code === "string" && code ? ` (code: ${code})` : "";
}

/** Adds `Authorization: Bearer <token>` without disturbing existing headers. */
function withBearerToken(
  init: RequestInit | undefined,
  token: string | null,
): RequestInit | undefined {
  if (!token) return init;
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return { ...init, headers };
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

  private sessionManager: SessionTokenSource | null = null;

  // Injected so tests can supply a fake without stubbing the global `fetch`.
  // Default wraps the global lazily (resolved at call time, not construction).
  constructor(
    private fetcher: typeof fetch = (input, init) => fetch(input, init),
    sessionManager: SessionTokenSource | null = null,
  ) {
    this.sessionManager = sessionManager;
  }

  /**
   * Attach the session manager that supplies anti-abuse capability tokens.
   *
   * Set after construction because solving a Turnstile challenge needs the
   * DOM, which the shared `aiClientManager` singleton has no access to at
   * module-init time — the web app wires this up during startup.
   */
  setSessionManager(sessionManager: SessionTokenSource | null): void {
    this.sessionManager = sessionManager;
  }

  /**
   * The single choke point for every oracle-proxy call.
   *
   * All three proxy paths — the operation pipeline, `sendInteraction`, and the
   * legacy passthrough — go through here, so capability tokens are attached in
   * exactly one place. Adding token logic at any individual call site instead
   * would guarantee one of them eventually gets missed.
   *
   * On any 401 — an expired token, a missing one (e.g. the Turnstile
   * handshake failed, such as when an ad blocker blocks
   * challenges.cloudflare.com), or a forged one — it re-handshakes and
   * replays the request **once**. A second 401 is returned to the caller: a
   * persistently rejected token means something is actually wrong, and
   * retrying it in a loop would hammer both Turnstile and the proxy.
   *
   * An arrow property, not a method, because it is passed around as a bare
   * `doFetch` callback and must stay bound.
   */
  private proxyFetch: typeof fetch = async (input, init) => {
    const manager = this.sessionManager;
    if (!manager) return this.fetcher(input, init);

    const token = await manager.getToken();
    const response = await this.fetcher(input, withBearerToken(init, token));

    if (response.status !== 401) return response;
    // Only string bodies can be replayed safely; a consumed stream cannot.
    // Every proxy call site sends JSON strings, so this is a guard, not a
    // limitation in practice.
    if (init?.body !== undefined && typeof init.body !== "string") {
      return response;
    }

    manager.invalidate();
    const freshToken = await manager.getToken();
    if (!freshToken) return response;

    return this.fetcher(input, withBearerToken(init, freshToken));
  };

  /**
   * Send a Gemini Interactions API turn through the proxy (server-side state).
   * Returns the new interaction id plus the model's text. Throws
   * {@link InteractionExpiredError} when the previous id has expired so the
   * caller can reset and replay full history.
   */
  async sendInteraction(params: {
    model: string;
    input: string;
    systemInstruction?: string;
    previousInteractionId?: string | null;
    storeConversation?: boolean;
    generationConfig?: Record<string, unknown>;
  }): Promise<{ id: string; text: string }> {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("You appear to be offline. Generation is unavailable.");
    }

    const body: Record<string, unknown> = {
      model: params.model,
      input: params.input,
      store: params.storeConversation ?? true,
    };
    if (params.systemInstruction) {
      body.system_instruction = params.systemInstruction;
    }
    if (params.previousInteractionId) {
      body.previous_interaction_id = params.previousInteractionId;
    }
    if (params.generationConfig) {
      body.generationConfig = params.generationConfig;
    }

    const response = await this.proxyFetch(DefaultAIClientManager.PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}) as any);

    if (!response.ok) {
      if (
        response.status === 409 ||
        data?.error?.code === "INTERACTION_NOT_FOUND"
      ) {
        throw new InteractionExpiredError(
          data?.error?.message || "Interaction expired",
        );
      }
      throw new Error(
        `[OracleProxy] Interaction failed: ${data?.error?.message || "Unknown error"}${formatErrorCode(data?.error?.code)}`,
      );
    }

    return { id: data.id as string, text: (data.text as string) || "" };
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
    const doFetch = this.proxyFetch;

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
          sendMessageStream: async (query: string) => {
            const contents = [
              ...history,
              { role: "user", parts: [{ text: query }] },
            ];

            const result = await (model as any).generateContent({
              contents,
            });

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

      async generateContent(
        request: string | Array<GenerativeContentBlob | string> | any,
      ) {
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
        request: string | Array<GenerativeContentBlob | string> | any,
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

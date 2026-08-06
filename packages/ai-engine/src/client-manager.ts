import type {
  GoogleGenerativeAI as GoogleGenerativeAIType,
  GenerativeModel,
  GenerativeContentBlob,
} from "@google/generative-ai";
import { safeSnapshot } from "./text-generation-context";

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
 * Sends a plain-text generateContent request through oracle-proxy's
 * provider-neutral operation pipeline (specs/153-llm-model-registry)
 * instead of the legacy Gemini-only `contents`/`generationConfig` shape.
 * The Worker resolves the actual model (Gemini today, potentially Luna or
 * another provider later) via its registry — no model name is sent, per
 * that pipeline's contract. Returns a response shaped like the Google SDK's
 * `GenerativeModel.generateContent()` result so callers see no interface
 * change.
 */
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
      `[OracleProxy] Request failed: ${error.error?.message || "Unknown error"}`,
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

  // Injected so tests can supply a fake without stubbing the global `fetch`.
  // Default wraps the global lazily (resolved at call time, not construction).
  constructor(
    private fetcher: typeof fetch = (input, init) => fetch(input, init),
  ) {}

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

    const response = await this.fetcher(DefaultAIClientManager.PROXY_URL, {
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
        `[OracleProxy] Interaction failed: ${data?.error?.message || "Unknown error"}`,
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
    const doFetch = this.fetcher;

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

        // 1. Deep clone request data so any reactive proxies are removed
        // before the payload is normalized and serialized.
        const raw = safeSnapshot(request);

        // 2. Normalize to standard Google "Contents" array
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
          generationConfig =
            raw.generationConfig || raw.generation_config || {};
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

        // 3. Final sanitation of parts (Crucial for scalar field error)
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

        const requestSysInst =
          raw?.systemInstruction ?? raw?.system_instruction;
        const finalSysInst =
          systemInstruction ??
          (typeof requestSysInst === "string"
            ? requestSysInst
            : requestSysInst?.parts?.[0]?.text);

        // Non-text response modalities (e.g. inline image generation via
        // Gemini's multimodal endpoint) and non-text input parts (e.g. an
        // inlineData image sent as part of the prompt) have no equivalent
        // in the new operation-based pipeline, which only ever deals in
        // plain text messages both directions. Those requests keep using
        // today's exact legacy passthrough; only plain-text requests route
        // through the registry/resolver pipeline.
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
              `[OracleProxy] Request failed: ${error.error?.message || "Unknown error"}`,
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
    } as unknown as GenerativeModel;
  }
}

export const aiClientManager = new DefaultAIClientManager();

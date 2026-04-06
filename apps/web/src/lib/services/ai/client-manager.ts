import {
  GoogleGenerativeAI,
  type GenerativeModel,
  type GenerativeContentBlob,
} from "@google/generative-ai";

/**
 * DefaultAIClientManager manages connections to Google's Generative AI service.
 *
 * Supports two connection modes:
 * - **System Proxy**: When no API key is provided, requests are forwarded through
 *   the Cloudflare Worker proxy (free access)
 * - **Custom Key**: When user provides their own API key, requests go directly
 *   to Google Gemini API
 *
 * @example
 * ```typescript
 * const manager = new DefaultAIClientManager();
 *
 * // System Proxy mode (no API key)
 * const proxyModel = manager.getModel("", "gemini-1.5-pro");
 *
 * // Custom Key mode (user's API key)
 * const directModel = manager.getModel("user-api-key", "gemini-1.5-pro");
 * ```
 */
export class DefaultAIClientManager {
  private client: GoogleGenerativeAI | null = null;
  private currentKey: string | null = null;

  // Proxy configuration
  private static readonly PROXY_URL =
    "https://oracle-proxy.espen-erlandsen.workers.dev";

  /**
   * Gets or creates a GoogleGenerativeAI client instance for the given API key.
   * Caches the client to avoid recreating it for the same key.
   *
   * @param apiKey - The Google Gemini API key
   * @returns A GoogleGenerativeAI client instance
   */
  getClient(apiKey: string): GoogleGenerativeAI {
    if (!this.client || this.currentKey !== apiKey) {
      this.client = new GoogleGenerativeAI(apiKey);
      this.currentKey = apiKey;
    }
    return this.client;
  }

  /**
   * Gets a GenerativeModel instance for text generation.
   *
   * Automatically selects the connection mode based on API key presence:
   * - No API key → Returns proxy-backed model (System Proxy mode)
   * - With API key → Returns direct Google API model (Custom Key mode)
   *
   * @param apiKey - The Google Gemini API key (empty for proxy mode)
   * @param modelName - The model identifier (e.g., "gemini-1.5-pro")
   * @param systemInstruction - Optional system instruction to guide model behavior
   * @returns A GenerativeModel instance for content generation
   */
  getModel(
    apiKey: string,
    modelName: string,
    systemInstruction?: string,
  ): GenerativeModel {
    // If no API key, use proxy path
    if (!apiKey) {
      return this.createProxyModel(modelName, systemInstruction);
    }

    // User has API key - use direct path (Custom Key mode)
    const client = this.getClient(apiKey);
    return client.getGenerativeModel({
      model: modelName,
      systemInstruction,
    });
  }

  /**
   * Create a proxy-backed model that forwards requests to the Cloudflare Worker.
   * Used when no user API key is available (System Proxy mode).
   * @param modelName - The Gemini model to use (e.g., "gemini-1.5-pro")
   * @param systemInstruction - Optional system instruction for the model
   * @returns A GenerativeModel-like object that proxies requests
   */
  private createProxyModel(
    modelName: string,
    systemInstruction?: string,
  ): GenerativeModel {
    const proxyUrl = DefaultAIClientManager.PROXY_URL;

    return {
      model: modelName,
      systemInstruction,

      /**
       * Start a chat session (required for generateResponse in text-generation.service)
       */
      startChat: (options: any = {}) => {
        const history = options.history || [];
        // Use arrow function context or access via class instance
        const model = this.createProxyModel(modelName, systemInstruction);

        return {
          sendMessageStream: async (query: string) => {
            console.log("[OracleProxy] sendMessageStream (via proxy)", {
              query,
              history,
            });

            // For now, we don't support true streaming through the proxy (Cloudflare -> Client)
            // but we simulate the stream interface for compatibility.
            const result = await (model as any).generateContent(query);

            return {
              stream: (async function* () {
                yield {
                  text: () => result.response.text(),
                };
              })(),
            };
          },
        };
      },

      /**
       * Generate content by forwarding the request to the Oracle proxy.
       * @param request - The content to generate (string or blob array)
       * @returns Response object with text() method and candidates array
       * @throws Error if proxy request fails or returns invalid response
       */
      async generateContent(
        request: string | Array<GenerativeContentBlob | string> | any,
      ) {
        console.log(`[OracleProxy] Request for model: ${modelName}`);

        // 1. Deep clone request data so any reactive proxies are removed
        // before the payload is normalized and serialized.
        const raw = cloneRequestPayload(request);

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

        try {
          const body = {
            model: modelName,
            contents,
            system_instruction: systemInstruction
              ? { parts: [{ text: systemInstruction }] }
              : undefined,
            generationConfig,
          };

          console.log(`[OracleProxy] Fetching from: ${proxyUrl}`);
          const response = await fetch(proxyUrl, {
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
          console.log("[OracleProxy] Received data:", data);

          // Support for both text and image modalities by providing a safe text() helper
          // but always passing the full rawResponse for modality-specific services.
          const firstPart = data.candidates?.[0]?.content?.parts?.[0];

          return {
            response: {
              text: () => firstPart?.text || "",
              candidates: data.candidates || [],
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

function cloneRequestPayload<T>(request: T): T {
  if (typeof request !== "object" || request === null) {
    return request;
  }

  try {
    if (typeof structuredClone === "function") {
      return structuredClone(request);
    }
  } catch (error) {
    console.warn(
      "[OracleProxy] structuredClone failed, falling back to JSON clone:",
      error,
    );
  }

  try {
    return JSON.parse(JSON.stringify(request));
  } catch (error) {
    console.warn(
      "[OracleProxy] JSON clone failed, using original request object:",
      error,
    );
    return request;
  }
}

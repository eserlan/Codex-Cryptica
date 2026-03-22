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
  private readonly PROXY_URL = "https://oracle-proxy.codexcryptica.workers.dev";

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
    return {
      model: modelName,
      systemInstruction,
      
      /**
       * Generate content by forwarding the request to the Oracle proxy.
       * @param request - The content to generate (string or blob array)
       * @returns Response object with text() method and candidates array
       * @throws Error if proxy request fails or returns invalid response
       */
      async generateContent(
        request: string | Array<GenerativeContentBlob | string>,
      ) {
        const contents = Array.isArray(request)
          ? request.map((item) => ({
              role: "user",
              parts: typeof item === "string" ? [{ text: item }] : [item],
            }))
          : [{ role: "user", parts: [{ text: request }] }];

        const response = await fetch(
          this.PROXY_URL,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: modelName,
              contents,
              generationConfig: systemInstruction
                ? { systemInstruction }
                : undefined,
            }),
          },
        );

        if (!response.ok) {
          const error = await response.json().catch(() => ({
            error: { message: "Proxy request failed" },
          }));
          throw new Error(
            `[OracleProxy] Request failed: ${error.error?.message || "Unknown error"}`,
          );
        }

        const data = await response.json();

        // Validate response structure (Constitution IV: AI-First Extraction)
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
          throw new Error(
            "[OracleProxy] Invalid response: missing content in candidates",
          );
        }

        return {
          response: {
            text: () => data.candidates[0].content.parts[0].text,
            candidates: data.candidates || [],
          },
        };
      },
    } as unknown as GenerativeModel;
  }
}

export const aiClientManager = new DefaultAIClientManager();

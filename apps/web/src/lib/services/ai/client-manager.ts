import type {
  GoogleGenerativeAI as GoogleGenerativeAIType,
  GenerativeModel,
  GenerativeContentBlob,
} from "@google/generative-ai";

/**
 * DefaultAIClientManager manages connections to Google's Generative AI service.
 */
export class DefaultAIClientManager {
  private client: GoogleGenerativeAIType | null = null;
  private currentKey: string | null = null;
  private sdkPromise: Promise<typeof import("@google/generative-ai")> | null =
    null;

  // Proxy configuration
  private static readonly PROXY_URL =
    "https://oracle-proxy.espen-erlandsen.workers.dev";

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

    return {
      model: modelName,
      systemInstruction,

      startChat: (options: any = {}) => {
        const _history = options.history || [];
        const model = this.createProxyModel(modelName, systemInstruction);

        return {
          sendMessageStream: async (query: string) => {
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

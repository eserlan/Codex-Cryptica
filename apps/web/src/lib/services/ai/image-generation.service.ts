import { aiClientManager as defaultAiClientManager } from "./client-manager";
import type { ImageGenerationService, ImageGenerationOptions } from "schema";
import {
  buildVisualCanonResolutionPrompt,
  buildVisualPromptGenerationPrompt,
} from "./prompts/visual-distillation";
import { isAIEnabled, assertAIEnabled } from "./capability-guard";
import { GEMINI_API_BASE_URL } from "../../config/oracle-constants";
import { classifyApiError } from "./api-error-classifier";

export class DefaultImageGenerationService implements ImageGenerationService {
  constructor(
    private aiClientManager = defaultAiClientManager,
    // Injected for tests; default wraps the global `fetch` lazily.
    private fetcher: typeof fetch = (input, init) => fetch(input, init),
  ) {}

  async distillVisualPrompt(
    apiKey: string,
    query: string,
    context: string,
    modelName: string,
    _demoMode = false,
  ): Promise<string> {
    if (!isAIEnabled()) return query;
    if (!context) return query;

    const model = await this.aiClientManager.getModel(apiKey, modelName);

    console.log(`[ImageGenerationService] Stage 1: Resolving visual canon...`);

    // Stage 1: Interpretation Layer - Resolve Visual Canon
    const canonResolutionPrompt = buildVisualCanonResolutionPrompt(
      query,
      context,
    );
    const canonResult = await model.generateContent(canonResolutionPrompt);
    const canonSummary = canonResult.response.text()?.trim() || "";

    console.log(
      `[ImageGenerationService] Stage 2: Generating visual prompt...`,
    );

    // Stage 2: Generation Layer - Visual Prompt Generation
    const promptGenerationPrompt = buildVisualPromptGenerationPrompt(
      canonSummary,
      query,
    );

    try {
      const result = await model.generateContent(promptGenerationPrompt);
      const response = await result.response;
      const distilled = response.text().trim();
      console.log(
        `[ImageGenerationService] Final Distilled Visual Prompt: "${distilled.slice(0, 50)}..."`,
      );
      return distilled;
    } catch (err) {
      console.warn(
        "[ImageGenerationService] Failed to generate visual prompt, falling back to canon summary.",
        err,
      );
      return canonSummary || query;
    }
  }

  async generateImage(
    apiKey: string,
    prompt: string,
    modelName: string,
    options?: ImageGenerationOptions,
  ): Promise<Blob> {
    assertAIEnabled();
    const provider = options?.provider || "gemini";
    if (provider === "custom" && !apiKey) {
      throw new Error(
        "A custom image provider API key is required for image generation.",
      );
    }
    if (provider === "cloudflare" && options?.cloudflareAccountId && !apiKey) {
      throw new Error(
        "A Cloudflare API token is required when a custom Cloudflare Account ID is configured.",
      );
    }

    // Fetch the raw API response, classifying network/quota/offline errors.
    // processImageResponse is called outside this block so its specific
    // messages (no image data, text returned) propagate without being replaced.
    let rawData: any;
    try {
      if (provider === "cloudflare") {
        const cfAccountId = options?.cloudflareAccountId;
        const cfApiToken = apiKey;

        if (cfAccountId && cfApiToken) {
          console.log(
            `[ImageGenerationService] Generating image via direct Cloudflare Workers AI: ${modelName}`,
          );
          const url = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/${modelName}`;
          const form = new FormData();
          form.append("prompt", prompt);
          form.append("width", "1024");
          form.append("height", "1024");
          const response = await this.fetcher(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${cfApiToken}`,
            },
            body: form,
          });

          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            const message = err.errors?.[0]?.message || response.statusText;
            throw new Error(
              `Cloudflare Workers AI Error (${modelName}): ${message}`,
            );
          }

          const json = await response.json();
          const b64 = json.result?.image;
          if (!b64) {
            throw new Error("No image data found in Cloudflare response");
          }
          rawData = {
            candidates: [
              {
                content: {
                  parts: [{ inlineData: { data: b64, mimeType: "image/png" } }],
                },
              },
            ],
          };
        } else {
          console.log(
            `[ImageGenerationService] Generating image via proxy using Cloudflare Workers AI: ${modelName}`,
          );
          const baseUrl =
            (typeof import.meta !== "undefined" &&
              import.meta.env?.VITE_ORACLE_PROXY_URL) ||
            (typeof import.meta !== "undefined" &&
            import.meta.env?.DEV &&
            !import.meta.env?.VITEST
              ? "http://localhost:8787"
              : "https://oracle-proxy.espen-erlandsen.workers.dev");
          const proxyUrl = `${baseUrl}/v1/images/generations`;
          const response = await this.fetcher(proxyUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: modelName,
              prompt: prompt,
            }),
          });

          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            const message = err.error?.message || response.statusText;
            throw new Error(
              `Proxy Cloudflare Image Generation Error (${modelName}): ${message}`,
            );
          }

          const json = await response.json();
          const b64 = json.result?.image;
          if (!b64) {
            throw new Error(
              "No image data returned from proxy Cloudflare Workers AI",
            );
          }
          rawData = {
            candidates: [
              {
                content: {
                  parts: [{ inlineData: { data: b64, mimeType: "image/png" } }],
                },
              },
            ],
          };
        }
      } else if (provider === "custom") {
        console.log(
          `[ImageGenerationService] Generating image via custom provider: ${modelName}`,
        );
        const customBaseUrl =
          options?.baseUrl || "https://api.together.xyz/v1/images/generations";
        const response = await this.fetcher(customBaseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelName,
            prompt: prompt,
            response_format: "b64_json",
            n: 1,
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          const message = err.error?.message || response.statusText;
          throw new Error(
            `Custom Image Generation Error (${modelName}): ${message}`,
          );
        }

        const json = await response.json();
        const b64 = json.data?.[0]?.b64_json;
        if (!b64) {
          throw new Error("No b64_json found in custom provider response");
        }
        // Mock the gemini response structure so processImageResponse works:
        rawData = {
          candidates: [
            {
              content: {
                parts: [{ inlineData: { data: b64, mimeType: "image/png" } }],
              },
            },
          ],
        };
      } else if (!apiKey) {
        console.log(
          `[ImageGenerationService] Generating image via proxy: ${modelName}`,
        );
        const model = await this.aiClientManager.getModel("", modelName);
        const response = await (model as any).generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            response_modalities: ["IMAGE"],
          },
        });
        rawData = response.rawResponse || response;
      } else {
        console.log(
          `[ImageGenerationService] Generating image directly with model: ${modelName}`,
        );
        const url = `${GEMINI_API_BASE_URL}/models/${modelName}:generateContent`;
        const response = await this.fetcher(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { response_modalities: ["IMAGE"] },
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          const message = err.error?.message || response.statusText;
          throw new Error(`Image Generation Error (${modelName}): ${message}`);
        }
        rawData = await response.json();
      }
    } catch (err: unknown) {
      const classified = classifyApiError(err);
      console.error(
        `[ImageGenerationService] Image generation failed:`,
        classified.message,
      );
      const message =
        classified.type === "safety"
          ? "The Oracle cannot visualize this request due to safety policies."
          : classified.message;
      throw new Error(message, { cause: err });
    }

    return this.processImageResponse(rawData);
  }

  private processImageResponse(data: any): Blob {
    // Navigate standard Google response structure
    const candidates = data.candidates || [];
    const firstCandidate = candidates[0] || {};
    const content = firstCandidate.content || {};
    const parts = content.parts || [];

    // Find the part containing image data
    const imagePart = parts.find((p: any) => p.inlineData);
    const directImageData =
      typeof data?.result?.image === "string" ? data.result.image : undefined;
    const base64Data = this.cleanBase64ImageData(
      imagePart?.inlineData?.data || directImageData,
    );

    if (!base64Data) {
      // Fallback for text-only responses or errors
      const textPart = parts.find((p: any) => p.text);
      if (textPart) {
        throw new Error(
          `AI returned text instead of an image: "${textPart.text.slice(0, 100)}..."`,
        );
      }
      console.error(
        "[ImageGenerationService] No image data in response:",
        data,
      );
      throw new Error("No image data returned from AI");
    }

    try {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const mimeType =
        imagePart?.inlineData?.mimeType ||
        this.inferMimeTypeFromBase64(base64Data) ||
        "image/png";
      return new Blob([bytes], { type: mimeType });
    } catch (e) {
      console.error("[ImageGenerationService] Failed to decode base64:", e);
      throw new Error("Failed to process image data from AI", { cause: e });
    }
  }

  private cleanBase64ImageData(value?: string): string | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    const dataUrlMatch = trimmed.match(/^data:([^;]+);base64,([\s\S]+)$/i);
    return (dataUrlMatch?.[2] || trimmed).replace(/\s+/g, "");
  }

  private inferMimeTypeFromBase64(value: string): string | undefined {
    if (value.startsWith("iVBORw0KGgo")) return "image/png";
    if (value.startsWith("/9j/")) return "image/jpeg";
    if (value.startsWith("UklGR")) return "image/webp";
    return undefined;
  }
}

export const imageGenerationService = new DefaultImageGenerationService();

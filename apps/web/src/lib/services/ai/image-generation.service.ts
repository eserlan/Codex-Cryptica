import { aiClientManager as defaultAiClientManager } from "./client-manager";
import type { ImageGenerationService } from "schema";
import {
  buildEnhancePrompt,
  buildVisualDistillationPrompt,
} from "./prompts/visual-distillation";
import { isAIEnabled, assertAIEnabled } from "./capability-guard";
import { GEMINI_API_BASE_URL } from "../../config/oracle-constants";

export class DefaultImageGenerationService implements ImageGenerationService {
  constructor(private aiClientManager = defaultAiClientManager) {}

  async distillVisualPrompt(
    apiKey: string,
    query: string,
    context: string,
    modelName: string,
    _demoMode = false,
  ): Promise<string> {
    if (!isAIEnabled()) return query;
    if (!context) return query;

    const model = this.aiClientManager.getModel(apiKey, modelName);

    console.log(
      `[ImageGenerationService] Distilling visual prompt using: ${modelName}`,
    );

    const prompt = buildVisualDistillationPrompt(query, context);

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const distilled = response.text().trim();
      console.log(
        `[ImageGenerationService] Distilled Visual Prompt: "${distilled.slice(0, 50)}..."`,
      );
      return distilled;
    } catch (err) {
      console.warn(
        "[ImageGenerationService] Failed to distill visual prompt, falling back to enhanced prompt.",
        err,
      );
      return buildEnhancePrompt(query, context);
    }
  }

  async generateImage(
    apiKey: string,
    prompt: string,
    modelName: string,
  ): Promise<Blob> {
    assertAIEnabled();

    // If no API key, use proxy path via client manager
    if (!apiKey) {
      console.log(
        `[ImageGenerationService] Generating image via proxy: ${modelName}`,
      );
      const model = this.aiClientManager.getModel("", modelName);

      const response = await (model as any).generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          response_modalities: ["IMAGE"],
        },
      });

      // Use the raw response for consistent parsing
      return this.processImageResponse(response.rawResponse || response);
    }

    try {
      console.log(
        `[ImageGenerationService] Generating image directly with model: ${modelName}`,
      );
      const url = `${GEMINI_API_BASE_URL}/models/${modelName}:generateContent`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            response_modalities: ["IMAGE"],
          },
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        const message = err.error?.message || response.statusText;

        if (
          message.toLowerCase().includes("safety") ||
          message.toLowerCase().includes("block")
        ) {
          throw new Error(
            "The Oracle cannot visualize this request due to safety policies.",
          );
        }
        throw new Error(`Image Generation Error (${modelName}): ${message}`);
      }

      const data = await response.json();
      return this.processImageResponse(data);
    } catch (err: any) {
      console.error(
        `[ImageGenerationService] Image generation failed:`,
        err.message,
      );
      throw err;
    }
  }

  private processImageResponse(data: any): Blob {
    // Navigate standard Google response structure
    const candidates = data.candidates || [];
    const firstCandidate = candidates[0] || {};
    const content = firstCandidate.content || {};
    const parts = content.parts || [];

    // Find the part containing image data
    const imagePart = parts.find((p: any) => p.inlineData);
    const base64Data = imagePart?.inlineData?.data;

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

      const mimeType = imagePart.inlineData.mimeType || "image/png";
      return new Blob([bytes], { type: mimeType });
    } catch (e) {
      console.error("[ImageGenerationService] Failed to decode base64:", e);
      throw new Error("Failed to process image data from AI", { cause: e });
    }
  }
}

export const imageGenerationService = new DefaultImageGenerationService();

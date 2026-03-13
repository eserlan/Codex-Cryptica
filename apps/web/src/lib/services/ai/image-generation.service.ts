import { aiClientManager } from "./client-manager";
import type { ImageGenerationService } from "schema";
import { buildEnhancePrompt, buildVisualDistillationPrompt } from "./prompts/visual-distillation";
import { isAIEnabled, assertAIEnabled } from "./capability-guard";

class DefaultImageGenerationService implements ImageGenerationService {
  async distillVisualPrompt(
    apiKey: string,
    query: string,
    context: string,
    modelName: string,
    _demoMode = false,
  ): Promise<string> {
    if (!isAIEnabled()) return query;
    if (!context) return query;

    const model = aiClientManager.getModel(apiKey, modelName);

    console.log(`[ImageGenerationService] Distilling visual prompt using: ${modelName}`);

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
    try {
      console.log(`[ImageGenerationService] Generating image with model: ${modelName}`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
      const parts = data.candidates?.[0]?.content?.parts || [];

      const imagePart = parts.find((p: any) => p.inlineData);
      const base64Data = imagePart?.inlineData?.data;

      if (!base64Data) {
        const textPart = parts.find((p: any) => p.text);
        if (textPart) {
          throw new Error(
            `AI returned text instead of an image: "${textPart.text.slice(0, 100)}..."`,
          );
        }
        throw new Error("No image data returned from AI");
      }

      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return new Blob([bytes], { type: "image/png" });
    } catch (err: any) {
      console.error(`[ImageGenerationService] Image generation failed:`, err.message);
      throw err;
    }
  }
}

export const imageGenerationService = new DefaultImageGenerationService();

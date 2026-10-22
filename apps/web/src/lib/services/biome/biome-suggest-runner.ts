import type { SuggestRunner } from "biome-engine";

/** The slice of the AI client manager the runner needs. */
export interface BiomeSuggestAiClient {
  getModel(
    apiKey: string,
    modelName: string,
    systemInstruction?: string,
  ): Promise<{
    generateContent(
      request: unknown,
      options?: { signal?: AbortSignal },
    ): Promise<{ response: { text(): string } }>;
  }>;
}

export interface BiomeSuggestSettings {
  readonly effectiveApiKey: string | null;
  readonly modelName: string;
}

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const MAX_OUTPUT_TOKENS = 800;

/**
 * Adapts the app's AI client to the engine's runner type. It only reads a
 * model response; the engine validates it and the user decides what to keep.
 */
export function createBiomeSuggestRunner(deps: {
  aiClient: BiomeSuggestAiClient;
  settings: BiomeSuggestSettings;
}): SuggestRunner {
  return async ({ system, user, signal }) => {
    if (signal?.aborted) {
      const error = new Error("Cancelled");
      error.name = "AbortError";
      throw error;
    }
    const model = await deps.aiClient.getModel(
      deps.settings.effectiveApiKey ?? "",
      deps.settings.modelName || DEFAULT_MODEL,
      system,
    );
    const response = await model.generateContent(
      {
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          responseMimeType: "application/json",
        },
      },
      { signal },
    );
    return response.response.text();
  };
}

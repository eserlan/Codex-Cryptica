import { aiClientManager } from "@codex/ai-engine";
import { classifyApiError } from "@codex/ai-engine";
import type { PublicGeneratorOutput } from "generator-engine";
import type { GeneratorOutput } from "./generator-helpers";

/** Single source of truth for the generator model id (#1494). */
export const GENERATOR_MODEL_ID = "gemini-3.5-flash-lite";
export const LANGUAGE_GENERATION_CONFIG = {
  temperature: 0.35,
  topP: 0.8,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
};

/**
 * Bridge the package's {@link PublicGeneratorOutput} (whose `type` is a plain
 * string) onto the SEO {@link GeneratorOutput} union the public pages expect.
 */
export function toSeoOutput(o: PublicGeneratorOutput): GeneratorOutput {
  return { ...o, type: o.type as GeneratorOutput["type"] };
}

/**
 * Shared AI transport for every SEO generator (#1494): resolves the model,
 * streams or awaits its response, and provides the AI-with-local-fallback
 * flow every generator method in {@link DefaultGeneratorEngine} builds on.
 * Isolated from prompt building/parsing, which stays generator-specific.
 */
export class GeneratorAITransport {
  private streamPreview: ((text: string) => void) | undefined;

  constructor(private clientManager = aiClientManager) {}

  async generateWithPreview<T>(
    generate: () => Promise<T>,
    onPreview: (text: string) => void,
  ): Promise<T> {
    if (this.streamPreview) return generate();
    this.streamPreview = onPreview;
    try {
      return await generate();
    } finally {
      this.streamPreview = undefined;
    }
  }

  /**
   * Shared AI-with-local-fallback flow for every generator (#1494). When AI is
   * requested (`useAI !== false`) we try the AI path and, on any failure, fall
   * back to the local tables while stamping `aiFallback` so the UI can surface a
   * friendly "AI was unavailable" notice. When AI is not requested we go
   * straight to local with no flag.
   */
  async runWithAIFallback(
    useAI: boolean | undefined,
    aiAttempt: () => Promise<PublicGeneratorOutput>,
    local: () => PublicGeneratorOutput,
  ): Promise<GeneratorOutput> {
    if (useAI !== false) {
      try {
        return toSeoOutput(await aiAttempt());
      } catch (err) {
        // Distinguish routine, user-facing failure classes (offline, rate
        // limits, quota, safety) from a genuine AI-pipeline defect (e.g. an
        // unparseable response). Both fall back to local tables, but an
        // "unknown" error is logged at error level so real regressions are not
        // masked behind a warn (#1494 review follow-up).
        const { type } = classifyApiError(err);
        if (type === "unknown") {
          console.error(
            "AI generation failed unexpectedly, falling back to local tables:",
            err,
          );
        } else {
          console.warn(
            `AI generation unavailable (${type}), falling back to local tables.`,
          );
        }
        return toSeoOutput({ ...local(), aiFallback: true });
      }
    }
    return toSeoOutput(local());
  }

  /**
   * Shared AI call: resolve the model once (single source for the model id),
   * run the prompt, and return trimmed text. Each generator keeps its own
   * prompt builder and response parser; only this transport is shared (#1494).
   */
  async runModel(
    systemInstruction: string,
    userMessage: string,
    generationConfig?: typeof LANGUAGE_GENERATION_CONFIG,
  ): Promise<string> {
    const model = await this.clientManager.getModel(
      "",
      GENERATOR_MODEL_ID,
      systemInstruction,
    );
    const request = generationConfig
      ? {
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          generationConfig,
        }
      : userMessage;
    const streamingModel = model as unknown as {
      generateContentStream?(
        request: unknown,
      ): AsyncGenerator<
        | { type: "delta"; text: string }
        | { type: "complete"; text: string }
        | { type: "error"; error: string }
        | { type: "started" }
      >;
    };
    if (this.streamPreview && streamingModel.generateContentStream) {
      let text = "";
      for await (const event of streamingModel.generateContentStream(request)) {
        if (event.type === "delta") {
          text += event.text;
          this.streamPreview(text);
        } else if (event.type === "complete") {
          // Provider terminal frames occasionally carry only whitespace or a
          // short trailing fragment. The accumulated deltas are the source of
          // truth unless this frame contains a strictly more complete body.
          if (event.text.trim().length > text.trim().length) {
            text = event.text;
          }
        } else if (event.type === "error") {
          throw new Error(event.error);
        }
      }
      return text.trim();
    }
    const response = await model.generateContent(request);
    return response.response.text().trim();
  }

  /**
   * Multi-pass AI call over a single real chat session (#2033). Unlike
   * runModel's one-shot call, each turn sent on the returned session sees
   * every prior turn's actual text as conversation history — the model reads
   * its own earlier output instead of us hand-summarizing it back in. Used
   * where a single long generation has repeatedly contradicted its own
   * earlier sections (council-vote's paths vs. its own roster).
   */
  async startChat(systemInstruction: string) {
    const model = await this.clientManager.getModel(
      "",
      GENERATOR_MODEL_ID,
      systemInstruction,
    );
    return model.startChat({ history: [] });
  }

  async sendChatMessage(
    chat: Awaited<ReturnType<GeneratorAITransport["startChat"]>>,
    userMessage: string,
  ): Promise<string> {
    const result = await chat.sendMessageStream(userMessage);
    let text = "";
    for await (const chunk of result.stream) {
      text += chunk.text();
    }
    return text.trim();
  }
}

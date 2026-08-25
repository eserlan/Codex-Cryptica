import type {
  AIGeneratorChatSession,
  AIGeneratorCompleteOptions,
  AIGeneratorGateway,
  GenerationEvent,
} from "generator-engine";
import { createIncrementalJsonScanner } from "generator-engine";
import {
  aiClientManager,
  InteractionExpiredError,
  GENERATOR_INTERACTION_MODEL_KEY,
  type DefaultAIClientManager,
} from "@codex/ai-engine";

// Only matters for the non-interaction Gemini-SDK-shaped path below —
// the Interactions path uses GENERATOR_INTERACTION_MODEL_KEY instead, which
// is deliberately separate from the chat/revision key (see client-manager).
const GENERATOR_MODEL = "gemini-3.5-flash-lite";
const GENERATOR_GENERATION_CONFIG = {
  temperature: 0.85,
  topP: 0.95,
  maxOutputTokens: 4096,
  responseMimeType: "application/json",
};

/**
 * Extract the first balanced JSON object from a model response, tolerating code
 * fences, leading prose, and trailing garbage (e.g. a degenerate run of "}").
 * Walks the string tracking string literals/escapes so braces inside strings
 * don't throw off the depth count.
 */
export function extractJsonObject(raw: string): string {
  const t = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const start = t.indexOf("{");
  if (start === -1) return t;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < t.length; i++) {
    const ch = t[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return t.slice(start, i + 1);
    }
  }
  return t.slice(start);
}

export class ProxyAIGeneratorGateway implements AIGeneratorGateway {
  constructor(private readonly clientManager: DefaultAIClientManager) {}

  async complete(
    prompt: string,
    systemInstruction: string,
    options?: AIGeneratorCompleteOptions,
  ) {
    const interaction = options?.interaction;
    const generationConfig = {
      ...GENERATOR_GENERATION_CONFIG,
      ...options?.generationConfig,
    };
    if (interaction) {
      try {
        const result = await this.clientManager.sendInteraction({
          model: GENERATOR_INTERACTION_MODEL_KEY,
          input: interaction.input,
          systemInstruction,
          previousInteractionId: interaction.previousInteractionId,
          storeConversation: interaction.store ?? true,
          generationConfig,
          signal: options?.signal,
        });
        return {
          text: extractJsonObject(result.text),
          interactionId: result.id,
          usedInteraction: true,
        };
      } catch (err) {
        if (!(err instanceof InteractionExpiredError)) throw err;
        const result = await this.clientManager.sendInteraction({
          model: GENERATOR_INTERACTION_MODEL_KEY,
          input: interaction.replayPrompt ?? prompt,
          systemInstruction,
          previousInteractionId: null,
          storeConversation: interaction.store ?? true,
          generationConfig,
          signal: options?.signal,
        });
        return {
          text: extractJsonObject(result.text),
          interactionId: result.id,
          usedInteraction: true,
          replayed: true,
        };
      }
    }

    const model = await this.clientManager.getModel(
      "",
      GENERATOR_MODEL,
      systemInstruction,
    );
    // Explicit decoding config: a generous token budget prevents long templated
    // lore from truncating, modest temperature keeps output creative but
    // coherent, and JSON mode reduces parse failures. (Passed as a full request
    // object so generationConfig reaches both the proxy and direct-key paths.)
    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    });
    // Salvage the JSON object even if the model appends trailing garbage (a
    // known degenerate-repetition failure mode) — JSON mode isn't reliably
    // enforced through the proxy.
    return extractJsonObject(response.response.text());
  }

  /**
   * Streaming counterpart to `complete()` (#2423). Only the non-interaction
   * (operation-pipeline) path actually streams — an interaction-backed
   * request degrades to a single `started`→`complete` pair built from the
   * existing buffered `sendInteraction()` flow, since the Interactions API's
   * own streaming support isn't built in this slice (see `types.ts`'s
   * `completeStream?` doc comment for why that's an acceptable degrade).
   */
  async *completeStream(
    prompt: string,
    systemInstruction: string,
    options?: AIGeneratorCompleteOptions,
  ): AsyncGenerator<GenerationEvent> {
    if (options?.interaction) {
      if (import.meta.env.DEV) {
        console.debug(
          "[Generator stream] interaction session selected; streaming falls back to one final response",
        );
      }
      yield { type: "started" };
      try {
        const result = await this.complete(prompt, systemInstruction, options);
        const text = typeof result === "string" ? result : result.text;
        const interactionId =
          typeof result === "string" ? undefined : result.interactionId;
        const replayed =
          typeof result === "string" ? undefined : result.replayed;
        yield { type: "complete", text, interactionId, replayed };
      } catch (err) {
        yield {
          type: "error",
          error: err instanceof Error ? err.message : String(err),
        };
      }
      return;
    }

    const generationConfig = {
      ...GENERATOR_GENERATION_CONFIG,
      ...options?.generationConfig,
    };
    const model = await this.clientManager.getModel(
      "",
      GENERATOR_MODEL,
      systemInstruction,
    );
    const modelWithStream = model as unknown as {
      generateContentStream(
        request: unknown,
        signal?: AbortSignal,
      ): AsyncGenerator<GenerationEvent>;
    };

    if (typeof modelWithStream.generateContentStream !== "function") {
      if (import.meta.env.DEV) {
        console.debug(
          "[Generator stream] current AI client has no stream method; falling back to one final response",
        );
      }
      // Direct-key (Custom Key) mode uses the real Google SDK model, which
      // has no streaming method wired here — degrade the same way the
      // interaction branch above does.
      yield { type: "started" };
      try {
        const response = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig,
        });
        yield {
          type: "complete",
          text: extractJsonObject(response.response.text()),
        };
      } catch (err) {
        yield {
          type: "error",
          error: err instanceof Error ? err.message : String(err),
        };
      }
      return;
    }

    const scan = createIncrementalJsonScanner();
    let buffer = "";

    for await (const event of modelWithStream.generateContentStream(
      {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
      },
      options?.signal,
    )) {
      if (import.meta.env.DEV) {
        console.debug("[Generator stream] gateway event", {
          type: event.type,
          textLength: event.type === "delta" ? event.text.length : undefined,
        });
      }
      if (event.type === "delta") {
        buffer += event.text;
        for (const field of scan(buffer)) {
          yield { type: "field", key: field.key, value: field.value };
        }
        yield event;
      } else if (event.type === "complete") {
        // Re-derive from the accumulated buffer, not `event.text`: the
        // buffer is what every `delta`/`field` event above was scanned
        // from, so the final parse must match what the UI already saw.
        yield {
          type: "complete",
          text: extractJsonObject(buffer || event.text),
          usage: event.usage,
        };
      } else {
        yield event;
      }
    }
  }

  async startChat(systemInstruction: string): Promise<AIGeneratorChatSession> {
    const model = await this.clientManager.getModel(
      "",
      GENERATOR_MODEL,
      systemInstruction,
    );
    const chat = model.startChat({ history: [] });
    const chatWithSignal = chat as unknown as {
      sendMessageStream(
        query: string,
        signal?: AbortSignal,
      ): Promise<{ stream: AsyncGenerator<{ text: () => string }> }>;
    };
    return {
      async send(userMessage: string): Promise<string> {
        const result = await chat.sendMessageStream(userMessage);
        let text = "";
        for await (const chunk of result.stream) {
          text += chunk.text();
        }
        return extractJsonObject(text.trim());
      },
      async *sendStream(
        userMessage: string,
        signal?: AbortSignal,
      ): AsyncGenerator<GenerationEvent> {
        yield { type: "started" };
        const scan = createIncrementalJsonScanner();
        let buffer = "";
        try {
          const result = await chatWithSignal.sendMessageStream(
            userMessage,
            signal,
          );
          for await (const chunk of result.stream) {
            const text = chunk.text();
            buffer += text;
            for (const field of scan(buffer)) {
              yield { type: "field", key: field.key, value: field.value };
            }
            yield { type: "delta", text };
          }
        } catch (err) {
          yield {
            type: "error",
            error: err instanceof Error ? err.message : String(err),
          };
          return;
        }
        yield { type: "complete", text: extractJsonObject(buffer) };
      },
    };
  }
}

export const aiGeneratorGateway: AIGeneratorGateway =
  new ProxyAIGeneratorGateway(aiClientManager);

import type {
  AIGeneratorChatSession,
  AIGeneratorCompleteOptions,
  AIGeneratorGateway,
} from "generator-engine";
import {
  aiClientManager,
  InteractionExpiredError,
  INTERACTION_MODEL_KEY,
  type DefaultAIClientManager,
} from "@codex/ai-engine";

// Only matters for the non-interaction Gemini-SDK-shaped path below —
// the Interactions path uses the provider-neutral INTERACTION_MODEL_KEY
// instead (see text-generation-chat.service.ts).
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
          model: INTERACTION_MODEL_KEY,
          input: interaction.input,
          systemInstruction,
          previousInteractionId: interaction.previousInteractionId,
          storeConversation: interaction.store ?? true,
          generationConfig,
        });
        return {
          text: extractJsonObject(result.text),
          interactionId: result.id,
          usedInteraction: true,
        };
      } catch (err) {
        if (!(err instanceof InteractionExpiredError)) throw err;
        const result = await this.clientManager.sendInteraction({
          model: INTERACTION_MODEL_KEY,
          input: interaction.replayPrompt ?? prompt,
          systemInstruction,
          previousInteractionId: null,
          storeConversation: interaction.store ?? true,
          generationConfig,
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

  async startChat(systemInstruction: string): Promise<AIGeneratorChatSession> {
    const model = await this.clientManager.getModel(
      "",
      GENERATOR_MODEL,
      systemInstruction,
    );
    const chat = model.startChat({ history: [] });
    return {
      async send(userMessage: string): Promise<string> {
        const result = await chat.sendMessageStream(userMessage);
        let text = "";
        for await (const chunk of result.stream) {
          text += chunk.text();
        }
        return extractJsonObject(text.trim());
      },
    };
  }
}

export const aiGeneratorGateway: AIGeneratorGateway =
  new ProxyAIGeneratorGateway(aiClientManager);

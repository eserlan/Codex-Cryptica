import { aiClientManager as defaultAiClientManager } from "./client-manager";
import {
  parseAdventureOocModelReply,
  type AdventureOocRequest,
  type AdventureOocResponse,
} from "@codex/adventure-engine";
import type { AdventureAIClient } from "./adventure-turn-generation.service";

function buildOocGeneratePayload(request: AdventureOocRequest) {
  return {
    contents: [
      {
        role: "user",
        parts: [{ text: request.serializedPrompt }],
      },
    ],
    generationConfig: { responseMimeType: "application/json" },
  };
}

/**
 * Stateless, read-only OOC clarification service. Never creates or mutates any
 * provider-managed narrative interaction session.
 */
export class AdventureOocService {
  constructor(
    private readonly aiClient: AdventureAIClient = defaultAiClientManager,
  ) {}

  async ask(
    request: AdventureOocRequest,
    options: { apiKey?: string; modelName?: string; signal?: AbortSignal } = {},
  ): Promise<AdventureOocResponse> {
    if (request.kind !== "ooc") {
      throw new Error("invalid-ooc-request");
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("offline");
    }
    const { signal } = options;
    signal?.throwIfAborted();
    const model = await this.aiClient.getModel(
      options.apiKey ?? "",
      options.modelName ?? "luna-fast",
      request.systemInstruction,
    );
    const result = await model.generateContent(
      buildOocGeneratePayload(request),
      { signal },
    );
    const raw = result.response.text();
    signal?.throwIfAborted();
    const parsed = parseAdventureOocModelReply(raw);
    if (!parsed.answer) throw new Error("empty-ooc-answer");
    return parsed;
  }
}

export const adventureOocService = new AdventureOocService();

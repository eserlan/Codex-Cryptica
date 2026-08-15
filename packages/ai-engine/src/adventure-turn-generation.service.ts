import { aiClientManager as defaultAiClientManager } from "./client-manager";
import {
  buildAdventurePrompt,
  parseTurnProposal,
  type AdventureSession,
  type AdventureTurnProposal,
  type ResolvedSourceExcerpt,
  type SuppliedRollOutcome,
} from "@codex/adventure-engine";

export interface AdventureTurnGenerationRequest {
  session: AdventureSession;
  phase: "opening" | "action" | "roll-resolution";
  playerAction?: string;
  rollResolution?: SuppliedRollOutcome;
  anchors: ResolvedSourceExcerpt[];
  relevant: ResolvedSourceExcerpt[];
  signal?: AbortSignal;
}

export interface AdventureAIClient {
  getModel(
    apiKey: string,
    modelName: string,
    systemInstruction?: string,
  ): Promise<{
    generateContent(input: unknown): Promise<{ response: { text(): string } }>;
  }>;
}

export class AdventureTurnGenerationService {
  constructor(
    private readonly aiClient: AdventureAIClient = defaultAiClientManager,
  ) {}

  async generate(
    request: AdventureTurnGenerationRequest,
    options: { apiKey?: string; modelName?: string; signal?: AbortSignal } = {},
  ): Promise<AdventureTurnProposal> {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("offline");
    }
    const signal = options.signal ?? request.signal;
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    const prompt = buildAdventurePrompt(request);
    const model = await this.aiClient.getModel(
      options.apiKey ?? "",
      options.modelName ?? "luna-fast",
      prompt.behavior,
    );
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt.serialized }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          required: ["kind"],
          properties: {
            kind: { type: "string", enum: ["complete", "roll-required"] },
          },
        },
      },
    });
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    try {
      return parseTurnProposal(JSON.parse(result.response.text()));
    } catch {
      throw new Error("invalid-adventure-response");
    }
  }
}

export const adventureTurnGenerationService =
  new AdventureTurnGenerationService();

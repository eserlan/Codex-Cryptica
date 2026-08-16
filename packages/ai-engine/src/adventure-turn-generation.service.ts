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

const patchSchema = {
  type: "object",
  required: ["add", "update", "removeIds"],
  properties: {
    add: { type: "array", items: { type: "object" } },
    update: { type: "array", items: { type: "object" } },
    removeIds: { type: "array", items: { type: "string" } },
  },
} as const;

const adventureTurnResponseSchema = {
  oneOf: [
    {
      type: "object",
      required: [
        "kind",
        "narration",
        "visiblePatch",
        "hiddenPatch",
        "revealSecretIds",
        "provisionalFacts",
        "sourceRecordIds",
      ],
      properties: {
        kind: { type: "string", enum: ["complete"] },
        narration: { type: "string" },
        visiblePatch: {
          type: "object",
          properties: {
            objectives: patchSchema,
            activeCharacters: patchSchema,
            knownFacts: patchSchema,
            relationships: patchSchema,
          },
          required: [
            "objectives",
            "activeCharacters",
            "knownFacts",
            "relationships",
          ],
        },
        hiddenPatch: {
          type: "object",
          properties: { secrets: patchSchema, gmThreads: patchSchema },
          required: ["secrets", "gmThreads"],
        },
        revealSecretIds: { type: "array", items: { type: "string" } },
        provisionalFacts: { type: "array", items: { type: "object" } },
        sourceRecordIds: { type: "array", items: { type: "string" } },
      },
    },
    {
      type: "object",
      required: ["kind", "uncertainty", "stakes", "sourceRecordIds"],
      properties: {
        kind: { type: "string", enum: ["roll-required"] },
        setupNarration: { type: "string" },
        uncertainty: { type: "string" },
        stakes: { type: "string" },
        dice: {
          type: "object",
          properties: {
            expression: { type: "string" },
            outcomeBands: { type: "array", items: { type: "object" } },
          },
          required: ["expression", "outcomeBands"],
        },
        sourceRecordIds: { type: "array", items: { type: "string" } },
      },
    },
  ],
} as const;

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
        responseSchema: adventureTurnResponseSchema,
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

import type {
  AdventureSession,
  AdventureWorldStyle,
  ResolvedSourceExcerpt,
  SuppliedRollOutcome,
} from "@codex/adventure-engine";

export interface AdventureTurnGenerationRequest {
  session: AdventureSession;
  phase: "opening" | "action" | "roll-resolution";
  playerAction?: string;
  rollResolution?: SuppliedRollOutcome;
  anchors: ResolvedSourceExcerpt[];
  relevant: ResolvedSourceExcerpt[];
  /** Vault genre or theme; plain data so it crosses the worker boundary. */
  worldStyle?: AdventureWorldStyle;
  /** Why the previous reply could not be used; set only on the one automatic retry. */
  correction?: string;
  signal?: AbortSignal;
  /** Ephemeral player-facing preview; never a committed or trusted turn. */
  onNarration?: (text: string) => void;
}

export interface AdventureAIClient {
  getModel(
    apiKey: string,
    modelName: string,
    systemInstruction?: string,
  ): Promise<{
    generateContent(
      input: unknown,
      requestOptions?: { signal?: AbortSignal },
    ): Promise<{ response: { text(): string } }>;
  }>;
  sendInteraction?: (params: {
    model: string;
    input: string;
    systemInstruction?: string;
    previousInteractionId?: string | null;
    storeConversation?: boolean;
    generationConfig?: Record<string, unknown>;
    signal?: AbortSignal;
  }) => Promise<{ id: string; text: string }>;
  sendInteractionStream?: (params: {
    model: string;
    input: string;
    systemInstruction?: string;
    previousInteractionId?: string | null;
    generationConfig?: Record<string, unknown>;
    signal?: AbortSignal;
  }) => AsyncIterable<
    | { type: "started" }
    | { type: "delta"; text: string }
    | { type: "complete"; text: string; id: string }
    | { type: "error"; error: string }
  >;
}

export interface AdventureGenerationOptions {
  apiKey?: string;
  modelName?: string;
  signal?: AbortSignal;
}

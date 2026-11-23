import type { LoreDeltaTracker } from "@codex/oracle-engine";
import type {
  buildAdventurePrompt,
  AdventureSession,
  AdventureTurnProposal,
  AdventureWorldStyle,
  PromptAdventurePackage,
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
  /** Scene-context excerpts of the pinned adventure package; plain data. */
  adventurePackage?: PromptAdventurePackage;
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
    reasoningEffort?: "low" | "medium" | "high" | "xhigh";
    signal?: AbortSignal;
  }) => Promise<{ id: string; text: string }>;
  sendInteractionStream?: (params: {
    model: string;
    input: string;
    systemInstruction?: string;
    previousInteractionId?: string | null;
    generationConfig?: Record<string, unknown>;
    reasoningEffort?: "low" | "medium" | "high" | "xhigh";
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
  reasoningEffort?: "low" | "medium" | "high" | "xhigh";
  signal?: AbortSignal;
}

/**
 * #5112: how a generation was produced, reported by the service so the app
 * layer can build the committed-turn generation descriptor. The app fills in
 * thread/reset classification and the model registry key at capture time;
 * the service reports only what the transport decision actually was.
 */
export interface AdventureGenerationInfo {
  /** Model registry key, when the service can resolve one. Never a raw provider ID. */
  modelKey?: string;
  reasoningEffort?: "low" | "medium" | "high" | "xhigh";
  /** Provider-managed interaction vs. stateless generation. */
  transport?: "interaction" | "stateless";
  requestChars?: number;
  sourceCounts?: Record<string, number>;
  scenarioIds?: string[];
  threadMode?: "new" | "continued" | "reset";
  resetReason?:
    | "turn-refresh"
    | "provider-expiry"
    | "model-change"
    | "source-change"
    | "revision-mismatch";
}

export type AdventurePrompt = ReturnType<typeof buildAdventurePrompt>;

/**
 * A generation result: the validated turn proposal plus, when the service
 * could classify it, how it was produced. Extra field is additive; older
 * callers that ignore it keep working.
 */
export type AdventureTurnGenerationResult = AdventureTurnProposal & {
  generationInfo?: AdventureGenerationInfo;
};

export interface AdventureInteraction {
  /** Only acknowledged after the local OPFS session commits this proposal. */
  previousInteractionId: string | null;
  tracker: LoreDeltaTracker;
  successfulTurns: number;
  revision: number | null;
  stateSnapshot: Record<string, unknown> | null;
  sourceHashes: Map<string, string>;
  modelName: string | null;
  resetReason?: AdventureGenerationInfo["resetReason"];
  /** A validated model reply is not necessarily a committed adventure turn. */
  pending: {
    id: string;
    revision: number;
    modelName: string;
    state: Record<string, unknown>;
    sourceEntries: Array<{ id: string; snippet: string; hash: string }>;
  } | null;
}

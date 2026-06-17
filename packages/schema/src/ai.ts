import type { Entity } from "./entity";

export const TIER_MODES = {
  lite: "gemini-3.1-flash-lite",
  advanced: "gemini-3-flash-preview",
};

export interface VaultMinimal {
  id?: string;
  entities: Record<string, Entity>;
  allEntities?: Entity[];
  selectedEntityId: string | null;
  inboundConnections: Record<string, any>;
  defaultVisibility: "visible" | "hidden";
  isGuest: boolean;
  activeVaultId?: string;
  loadEntityContent?: (id: string) => Promise<void>;
  titleAliasIndex?: Map<string, string>;
  allTitlesString?: string;
}

export interface ChatHistoryMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface PlotAnalysisEntity {
  entity: Entity;
  connectionType: string;
  label?: string;
  direction: "inbound" | "outbound";
}

export interface RelatedEntityContext {
  id: string;
  title: string;
  type: string;
  relation?: string;
  summary: string;
}

/** A single retrieved lore record, used for Interactions API delta tracking. */
export interface LoreContextEntry {
  /** Entity id, or a synthetic id such as `__style__`. */
  id: string;
  /** The text block to send to the model (may include a stable header). */
  snippet: string;
  /** Hash of entity.content (always-hydrated short field) + connection context. */
  hash: string;
}

export interface ContextRetrievalService {
  retrieveContext(
    query: string,
    excludeTitles: Set<string>,
    vault: VaultMinimal,
    lastEntityId?: string,
    isImage?: boolean,
  ): Promise<{
    content: string;
    primaryEntityId?: string;
    sourceIds: string[];
    /**
     * Per-record lore entries (entity id + sent snippet + stable-body hash) used
     * by the Interactions API flow to send only new/changed lore. Optional so
     * non-delta callers can ignore it.
     */
    entries?: LoreContextEntry[];
    activeStyleTitle?: string;
  }>;
  getConsolidatedContext(
    entity: Entity,
    options?: { isGuest?: boolean },
  ): string;
}

export interface TextGenerationService {
  expandQuery(
    apiKey: string,
    query: string,
    history: ChatHistoryMessage[],
  ): Promise<string>;
  distillContext?(
    apiKey: string,
    context: string,
    modelName: string,
  ): Promise<string>;
  generateResponse(
    apiKey: string,
    query: string,
    history: ChatHistoryMessage[],
    context: string,
    modelName: string,
    onUpdate: (partial: string) => void,
    demoMode?: boolean,
    categories?: string[],
    options?: {
      requestId?: string;
      vaultId?: string;
      existingEntities?: Entity[];
      systemInstructionOverride?: string;
      /**
       * Per-record lore for the Interactions API delta flow. When present (and
       * running through the proxy), only new/changed records are sent; the rest
       * are retained server-side via `previous_interaction_id`.
       */
      loreEntries?: LoreContextEntry[];
      /** Stable key identifying the conversation for interaction state. */
      conversationId?: string;
      /**
       * Whether the Interactions API path is enabled. Must be passed explicitly
       * because text generation runs in a Web Worker with its own module scope —
       * a main-thread module-global flag would never reach it.
       */
      interactionsEnabled?: boolean;
    },
  ): Promise<void>;
  generateMergeProposal(
    apiKey: string,
    modelName: string,
    target: Entity,
    sources: Entity[],
    options?: { isGuest?: boolean },
  ): Promise<{ body: string; lore?: string }>;
  reviseEntityUpdate?(
    apiKey: string,
    modelName: string,
    entity: Entity,
    incoming: {
      chronicle: string;
      lore: string;
    },
    relatedEntities?: RelatedEntityContext[],
    categories?: { id: string; label?: string; description?: string }[],
    options?: {
      isGuest?: boolean;
      source?: string;
      instructions?: string;
      priority?: "instructions-first" | "incoming-first" | "preserve-existing";
      themeId?: string;
      interactionsEnabled?: boolean;
    },
  ): Promise<{
    content: string;
    lore: string;
    categoryId?: string;
  }>;
  generatePlotAnalysis(
    apiKey: string,
    modelName: string,
    subject: Entity,
    connectedEntities: PlotAnalysisEntity[],
    userQuery: string,
    options?: { isGuest?: boolean },
  ): Promise<string>;
  generateStructuredEntity?(
    apiKey: string,
    query: string,
    context: string,
    modelName: string,
    onUpdate: (partial: string) => void,
    categories?: string[],
  ): Promise<void>;
  generateRelatedEntity?(
    apiKey: string,
    modelName: string,
    sourceEntity: {
      title: string;
      type: string;
      content?: string;
      lore?: string;
    },
    targetType: string,
    relationship: string,
    customInstructions?: string,
    connectedEntities?: ConnectedEntityPromptContext[],
    categories?: { id: string; label?: string }[],
    templateOutline?: string,
    options?: { isGuest?: boolean },
  ): Promise<{
    name: string;
    type: string;
    summary: string;
    description: string;
    labels?: string[];
    plotHook?: string;
    relationshipBack?: string;
  }>;
}

export interface ConnectedEntityPromptContext {
  title: string;
  type: string;
  relation: string;
  content: string;
}

export interface ImageGenerationOptions {
  provider?: "gemini" | "cloudflare" | "custom";
  baseUrl?: string;
  cloudflareAccountId?: string;
}

export interface ImageGenerationService {
  generateImage(
    apiKey: string,
    prompt: string,
    modelName: string,
    options?: ImageGenerationOptions,
  ): Promise<Blob>;
  distillVisualPrompt(
    apiKey: string,
    query: string,
    context: string,
    modelName: string,
    demoMode?: boolean,
  ): Promise<string>;
}

// ─── Sound Bite ───────────────────────────────────────────────────────────────

export type SoundBiteVoiceMode = "entity" | "scholar";

export interface VaultEntitySummary {
  title: string;
  type: string;
  summary: string;
}

/**
 * Voice characteristics used for TTS synthesis.
 * Shared between oracle-engine (generation) and the persisted SoundBite entity field.
 */
export interface VoiceProfile {
  gender: "male" | "female" | "neutral";
  ageRange: "child" | "young-adult" | "middle-aged" | "elder";
  /** e.g. "Hungarian", "Queen's English", null/undefined if unspecified */
  accent?: string | null;
  /** e.g. "gruff", "serene", "commanding", "scholarly" */
  tone: string;
}

export interface SoundBiteRequest {
  entity: Entity;
  voiceMode: SoundBiteVoiceMode;
  /** Condensed list of other vault entities for scholar lookup */
  vaultEntitySummaries: VaultEntitySummary[];
  /**
   * When provided, reuse this voice profile for TTS instead of the one the
   * LLM infers — preserves speaker timbre across same-mode regenerations.
   * Only applied when the saved bite's voiceMode matches the current mode.
   */
  voiceProfile?: VoiceProfile;
}

export interface ScholarAttribution {
  name: string;
  title: string;
}

export interface SoundBiteResult {
  transcript: string;
  audioBlob: Blob | null; // null if TTS unavailable/failed
  voiceMode: SoundBiteVoiceMode;
  scholarAttribution?: ScholarAttribution;
  /** The voice profile used for TTS — save this to preserve voice consistency on regeneration */
  voiceProfile: VoiceProfile;
}

export interface SoundBiteGenerationService {
  generateSoundBite(
    apiKey: string,
    modelName: string,
    request: SoundBiteRequest,
    options?: { isGuest?: boolean; isDemoMode?: boolean },
  ): Promise<SoundBiteResult>;
}

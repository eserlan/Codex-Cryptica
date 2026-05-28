import type { Entity } from "./entity";

export const TIER_MODES = {
  lite: "gemini-flash-lite-latest",
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
  title: string;
  type: string;
  relation?: string;
  summary: string;
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
    },
  ): Promise<void>;
  generateMergeProposal(
    apiKey: string,
    modelName: string,
    target: Entity,
    sources: Entity[],
    options?: { isGuest?: boolean },
  ): Promise<{ body: string; lore?: string }>;
  reconcileEntityUpdate?(
    apiKey: string,
    modelName: string,
    entity: Entity,
    incoming: {
      chronicle: string;
      lore: string;
    },
    relatedEntities?: RelatedEntityContext[],
    categories?: { id: string; label?: string; description?: string }[],
    options?: { isGuest?: boolean },
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
}

export interface ImageGenerationService {
  generateImage(
    apiKey: string,
    prompt: string,
    modelName: string,
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

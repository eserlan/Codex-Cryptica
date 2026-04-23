import type { Entity } from "./entity";

export const TIER_MODES = {
  lite: "gemini-flash-lite-latest",
  advanced: "gemini-3-flash-preview",
};

export interface VaultMinimal {
  entities: Record<string, Entity>;
  selectedEntityId: string | null;
  inboundConnections: Record<string, any>;
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
  getConsolidatedContext(entity: Entity): string;
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
      existingEntities?: any[];
    },
  ): Promise<void>;
  generateMergeProposal(
    apiKey: string,
    modelName: string,
    target: Entity,
    sources: Entity[],
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
  ): Promise<{
    content: string;
    lore: string;
  }>;
  generatePlotAnalysis(
    apiKey: string,
    modelName: string,
    subject: Entity,
    connectedEntities: PlotAnalysisEntity[],
    userQuery: string,
  ): Promise<string>;
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

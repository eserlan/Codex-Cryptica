export const TIER_MODES = {
  lite: "gemini-flash-lite-latest",
  advanced: "gemini-3-flash-preview",
};

export interface ContextRetrievalService {
  retrieveContext(query: string, excludeTitles: Set<string>, vault: any, lastEntityId?: string, isImage?: boolean): Promise<{
    content: string;
    primaryEntityId?: string;
    sourceIds: string[];
    activeStyleTitle?: string;
  }>;
  getConsolidatedContext(entity: any): string;
}

export interface TextGenerationService {
  expandQuery(apiKey: string, query: string, history: any[]): Promise<string>;
  generateResponse(
    apiKey: string,
    query: string,
    history: any[],
    context: string,
    modelName: string,
    onUpdate: (partial: string) => void,
    demoMode?: boolean
  ): Promise<void>;
  generateMergeProposal(apiKey: string, modelName: string, target: any, sources: any[]): Promise<{ body: string; lore?: string }>;
  generatePlotAnalysis(apiKey: string, modelName: string, subject: any, connectedEntities: any[], userQuery: string): Promise<string>;
}

export interface ImageGenerationService {
  generateImage(apiKey: string, prompt: string, modelName: string): Promise<Blob>;
  distillVisualPrompt(apiKey: string, query: string, context: string, modelName: string, demoMode?: boolean): Promise<string>;
}

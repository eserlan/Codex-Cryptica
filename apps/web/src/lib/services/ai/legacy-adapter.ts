import { contextRetrievalService } from "./context-retrieval.service";
import { textGenerationService } from "./text-generation.service";
import { imageGenerationService } from "./image-generation.service";

/**
 * @deprecated Legacy adapter for AIService. Use individual services from $lib/services/ai instead.
 */
export class AIService {
  async expandQuery(apiKey: string, query: string, history: any[]) {
    return textGenerationService.expandQuery(apiKey, query, history);
  }

  getConsolidatedContext(entity: any) {
    return contextRetrievalService.getConsolidatedContext(entity);
  }

  async distillVisualPrompt(apiKey: string, query: string, context: string, modelName: string, demoMode = false) {
    return imageGenerationService.distillVisualPrompt(apiKey, query, context, modelName, demoMode);
  }

  async generateImage(apiKey: string, prompt: string, modelName: string) {
    return imageGenerationService.generateImage(apiKey, prompt, modelName);
  }

  async generateMergeProposal(apiKey: string, modelName: string, target: any, sources: any[]) {
    return textGenerationService.generateMergeProposal(apiKey, modelName, target, sources);
  }

  async generatePlotAnalysis(apiKey: string, modelName: string, subject: any, connectedEntities: any[], userQuery: string) {
    return textGenerationService.generatePlotAnalysis(apiKey, modelName, subject, connectedEntities, userQuery);
  }

  async generateResponse(apiKey: string, query: string, history: any[], context: string, modelName: string, onUpdate: (partial: string) => void, demoMode = false) {
    return textGenerationService.generateResponse(apiKey, query, history, context, modelName, onUpdate, demoMode);
  }

  enhancePrompt(query: string, context: string) {
    if (!context) return query;
    return `You are a world-building artist. 

Use the following context to ground your visualization accurately. 
If a "GLOBAL ART STYLE" is provided, ensure the generated image strictly adheres to that aesthetic style.

${context}

User visualization request: ${query}`;
  }

  async retrieveContext(query: string, excludeTitles: Set<string>, vault: any, lastEntityId?: string, isImage = false) {
    return contextRetrievalService.retrieveContext(query, excludeTitles, vault, lastEntityId, isImage);
  }

  clearStyleCache() {
    contextRetrievalService.clearStyleCache();
  }

  // Bridged methods to Proposer
  async parseConnectionIntent(apiKey: string, modelName: string, input: string) {
    const { ProposerService } = await import("@codex/proposer");
    const proposer = new ProposerService();
    return proposer.parseConnectionIntent(apiKey, modelName, input);
  }

  async parseMergeIntent(apiKey: string, modelName: string, input: string) {
    const { ProposerService } = await import("@codex/proposer");
    const proposer = new ProposerService();
    return proposer.parseMergeIntent(apiKey, modelName, input);
  }

  async generateConnectionProposal(apiKey: string, modelName: string, source: any, target: any) {
    const { ProposerService } = await import("@codex/proposer");
    const proposer = new ProposerService();
    return proposer.generateConnectionProposal(
      apiKey,
      modelName,
      this.getConsolidatedContext(source),
      this.getConsolidatedContext(target),
      source.title,
      target.title,
    );
  }
}

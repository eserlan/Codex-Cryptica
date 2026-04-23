/// <reference lib="webworker" />
import * as Comlink from "comlink";
import { aiClientManager } from "../services/ai/client-manager";
import { DefaultTextGenerationService } from "../services/ai/text-generation.service";
import { draftingEngine } from "@codex/oracle-engine";
import type { OracleWorkerEvent, DiscoveryProposal } from "@codex/oracle-engine";

/**
 * OracleWorker handles heavy-lifting AI and logic tasks off the main thread.
 * This includes streaming chat responses, entity discovery, and reconciliation.
 */
class OracleWorker {
  private textGeneration: DefaultTextGenerationService;
  private eventBus: BroadcastChannel;

  constructor() {
    this.textGeneration = new DefaultTextGenerationService(aiClientManager);
    this.eventBus = new BroadcastChannel("codex-oracle-events");
  }

  private emit(event: OracleWorkerEvent) {
    this.eventBus.postMessage(event);
  }

  async expandQuery(apiKey: string, query: string, history: any[]): Promise<string> {
    return this.textGeneration.expandQuery(apiKey, query, history);
  }

  async distillContext(apiKey: string, context: string, modelName: string): Promise<string> {
    return this.textGeneration.distillContext(apiKey, context, modelName);
  }

  async generateMergeProposal(apiKey: string, modelName: string, target: any, sources: any[]): Promise<any> {
    return this.textGeneration.generateMergeProposal(apiKey, modelName, target, sources);
  }

  async reconcileEntityUpdate(
    apiKey: string,
    modelName: string,
    entity: any,
    incoming: { chronicle: string; lore: string },
    relatedEntities: any[] = []
  ): Promise<any> {
    return this.textGeneration.reconcileEntityUpdate(apiKey, modelName, entity, incoming, relatedEntities);
  }

  async generatePlotAnalysis(
    apiKey: string,
    modelName: string,
    subject: any,
    connectedEntities: any[],
    userQuery: string
  ): Promise<string> {
    return this.textGeneration.generatePlotAnalysis(apiKey, modelName, subject, connectedEntities, userQuery);
  }

  async generateResponse(
    apiKey: string,
    query: string,
    history: any[],
    context: string,
    modelName: string,
    onUpdate: (partial: string) => void,
    demoMode = false,
    categories?: string[],
    options: { vaultId?: string; requestId?: string; existingEntities?: any[] } = {}
  ): Promise<void> {
    const { vaultId, requestId, existingEntities = [] } = options;
    const discoveredTitles = new Set<string>();

    this.emit({ type: "ORACLE_THINKING_START", vaultId, requestId });

    try {
      await this.textGeneration.generateResponse(
        apiKey,
        query,
        history,
        context,
        modelName,
        async (partial) => {
          onUpdate(partial);

          // Proactive Incremental Discovery
          // We only run this if the text is long enough to potentially contain entities
          if (partial.length > 50) {
            const combinedText = `${query}\n\n${partial}`;
            const proposals = await draftingEngine.propose(combinedText, {
              existingEntities,
              history,
              categories,
            });

            const newProposals = proposals.filter(p => !discoveredTitles.has(p.title));
            for (const p of newProposals) {
              discoveredTitles.add(p.title);
              this.emit({
                type: "ORACLE_ENTITY_DISCOVERED",
                vaultId,
                requestId,
                payload: p
              });
            }
          }
        },
        demoMode,
        categories
      );
    } catch (err: any) {
      this.emit({ type: "ORACLE_ERROR", vaultId, requestId, payload: err.message });
      throw err;
    } finally {
      this.emit({ type: "ORACLE_THINKING_END", vaultId, requestId });
    }
  }

  async propose(text: string, context: { existingEntities: any[]; history: any[]; categories?: any[] }): Promise<DiscoveryProposal[]> {
    return draftingEngine.propose(text, context);
  }
}

Comlink.expose(new OracleWorker());

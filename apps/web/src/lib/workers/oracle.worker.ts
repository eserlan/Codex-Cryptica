/// <reference lib="webworker" />
import * as Comlink from "comlink";
import { aiClientManager } from "../services/ai/client-manager";
import { DefaultTextGenerationService } from "../services/ai/text-generation.service.svelte";
import { draftingEngine } from "../../../../../packages/oracle-engine/src/drafting-engine";
import type {
  OracleWorkerEvent,
  DiscoveryProposal,
} from "../../../../../packages/oracle-engine/src/types";
import type { LoreContextEntry } from "schema";

/**
 * OracleWorker handles heavy-lifting AI and logic tasks off the main thread.
 * This includes streaming chat responses, entity discovery, and revision.
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

  async expandQuery(
    apiKey: string,
    query: string,
    history: any[],
  ): Promise<string> {
    return this.textGeneration.expandQuery(apiKey, query, history);
  }

  async distillContext(
    apiKey: string,
    context: string,
    modelName: string,
  ): Promise<string> {
    return this.textGeneration.distillContext(apiKey, context, modelName);
  }

  async generateMergeProposal(
    apiKey: string,
    modelName: string,
    target: any,
    sources: any[],
    options?: { isGuest?: boolean },
  ): Promise<any> {
    return this.textGeneration.generateMergeProposal(
      apiKey,
      modelName,
      target,
      sources,
      options,
    );
  }

  async reviseEntityUpdate(
    apiKey: string,
    modelName: string,
    entity: any,
    incoming: { chronicle: string; lore: string },
    relatedEntities: any[] = [],
    categories: any[] = [],
    options?: {
      isGuest?: boolean;
      source?: string;
      instructions?: string;
      priority?: "instructions-first" | "incoming-first" | "preserve-existing";
      themeId?: string;
      interactionsEnabled?: boolean;
    },
  ): Promise<any> {
    return this.textGeneration.reviseEntityUpdate(
      apiKey,
      modelName,
      entity,
      incoming,
      relatedEntities,
      categories,
      options,
    );
  }

  async generatePlotAnalysis(
    apiKey: string,
    modelName: string,
    subject: any,
    connectedEntities: any[],
    userQuery: string,
    options?: { isGuest?: boolean },
  ): Promise<string> {
    return this.textGeneration.generatePlotAnalysis(
      apiKey,
      modelName,
      subject,
      connectedEntities,
      userQuery,
      options,
    );
  }

  async generateEntitiesFromPlot(
    apiKey: string,
    modelName: string,
    plotHookText: string,
    sourceEntityTitle: string,
    availableCategories: string[],
  ) {
    return this.textGeneration.generateEntitiesFromPlot(
      apiKey,
      modelName,
      plotHookText,
      sourceEntityTitle,
      availableCategories,
    );
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
    options: {
      vaultId?: string;
      requestId?: string;
      existingEntities?: any[];
      systemInstructionOverride?: string;
      // Interactions API delta flow — forwarded to TextGenerationService.
      loreEntries?: LoreContextEntry[];
      conversationId?: string;
      interactionsEnabled?: boolean;
    } = {},
  ): Promise<void> {
    const { vaultId, requestId, existingEntities = [] } = options;
    const discoveredTitles = new Set<string>();
    let proposalsEmitted = 0;
    const MAX_PROPOSALS = 5; // Hard cap to prevent UI spam and reduce AI usage costs

    this.emit({ type: "ORACLE_THINKING_START", vaultId, requestId });

    try {
      await this.textGeneration.generateResponse(
        apiKey,
        query,
        history,
        context,
        modelName,
        async (partial) => {
          await onUpdate(partial);

          // Proactive Incremental Discovery
          // We only run this if we haven't hit the cap and text is long enough
          if (proposalsEmitted < MAX_PROPOSALS && partial.length > 50) {
            const combinedText = `${query}\n\n${partial}`;
            const proposals = await draftingEngine.propose(combinedText, {
              existingEntities,
              history,
              categories,
            });

            const newProposals = proposals.filter((p) => {
              // Deduplicate against already emitted in this session
              if (discoveredTitles.has(p.title)) return false;

              // Deduplicate against already existing vault entities
              // (DraftingEngine does a check, but we verify here for safety)
              if (p.entityId) return false;

              return true;
            });
            for (const p of newProposals) {
              if (proposalsEmitted >= MAX_PROPOSALS) break;

              discoveredTitles.add(p.title);
              proposalsEmitted++;

              this.emit({
                type: "ORACLE_ENTITY_DISCOVERED",
                vaultId,
                requestId,
                payload: p,
              });
            }
          }
        },
        demoMode,
        categories,
        options,
      );
    } catch (err: any) {
      this.emit({
        type: "ORACLE_ERROR",
        vaultId,
        requestId,
        payload: err.message,
      });
      throw err;
    } finally {
      this.emit({ type: "ORACLE_THINKING_END", vaultId, requestId });
    }
  }

  async generateRelatedEntity(
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
    customInstructions = "",
    connectedEntities: any[] = [],
    categories: any[] = [],
    templateOutline = "",
    options?: { isGuest?: boolean; aiDisabled?: boolean },
  ): Promise<any> {
    return this.textGeneration.generateRelatedEntity(
      apiKey,
      modelName,
      sourceEntity,
      targetType,
      relationship,
      customInstructions,
      connectedEntities,
      categories,
      templateOutline,
      options,
    );
  }

  async generateStructuredEntity(
    apiKey: string,
    query: string,
    context: string,
    modelName: string,
    onUpdate: (partial: string) => void,
    categories?: string[],
    vaultId?: string,
    requestId?: string,
  ): Promise<void> {
    this.emit({ type: "ORACLE_THINKING_START", vaultId, requestId });
    try {
      return await this.textGeneration.generateStructuredEntity(
        apiKey,
        query,
        context,
        modelName,
        onUpdate,
        categories,
      );
    } finally {
      this.emit({ type: "ORACLE_THINKING_END", vaultId, requestId });
    }
  }

  async propose(
    text: string,
    context: { existingEntities: any[]; history: any[]; categories?: any[] },
  ): Promise<DiscoveryProposal[]> {
    return draftingEngine.propose(text, context);
  }
}

Comlink.expose(new OracleWorker());

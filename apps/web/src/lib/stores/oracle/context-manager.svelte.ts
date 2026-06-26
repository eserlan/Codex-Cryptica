import type { OracleExecutionContext } from "@codex/oracle-engine";
import { plotCache } from "../plot-cache";
import { oracleBridge } from "../../cloud-bridge/oracle-bridge";
import * as Comlink from "comlink";
import { appEventBus } from "@codex/events";
import { interactionSessions } from "../../services/ai/interaction-session";
import type { OracleUiSnapshot, IOracleStore } from "./types";

export class OracleContextManager {
  constructor(private store: IOracleStore) {}

  private createUiStoreSnapshot(): OracleUiSnapshot {
    const s = this.store;
    return {
      aiDisabled: s.discoveryPolicyStore.aiDisabled,
      isDemoMode: s.sessionModeStore.isDemoMode,
      entityDiscoveryMode: s.discoveryPolicyStore.entityDiscoveryMode,
      connectionDiscoveryMode: s.discoveryPolicyStore.connectionDiscoveryMode,
      autoArchive: s.discoveryPolicyStore.autoArchive,
      activeThemeId: s.themeStore.activeTheme?.id,
    };
  }

  getExecutionContext(): OracleExecutionContext {
    const s = this.store;
    const isWorker = oracleBridge.isReady;

    /**
     * Helper to wrap a method with Comlink.proxy only if it exists.
     * Prevents "Cannot convert undefined or null to object" errors in tests.
     */
    const wrap = (method: any) => {
      if (!method) return undefined;
      return isWorker ? Comlink.proxy(method) : method;
    };

    return {
      vaultId: s.vault.activeVaultId,
      interactionsEnabled: interactionSessions.enabled,
      vault: {
        activeVaultId: s.vault.activeVaultId,
        selectedEntityId: s.vault.selectedEntityId,
        entities: $state.snapshot(s.vault.entities),
        inboundConnections: $state.snapshot(s.vault.inboundConnections),
        defaultVisibility: s.vault.defaultVisibility,
        isGuest: s.vault.isGuest,
        createEntity: wrap(s.vault.createEntity?.bind(s.vault)),
        updateEntity: wrap(s.vault.updateEntity?.bind(s.vault)),
        addConnection: wrap(s.vault.addConnection?.bind(s.vault)),
        removeConnection: wrap(s.vault.removeConnection?.bind(s.vault)),
        saveImageToVault: wrap(s.vault.saveImageToVault?.bind(s.vault)),
        loadEntityContent: wrap(s.vault.loadEntityContent?.bind(s.vault)),
      },
      uiStore: this.createUiStoreSnapshot(),
      chatHistory: {
        messages: $state.snapshot(s.chatHistoryService.messages),
        getMessages: wrap(() => [...s.chatHistoryService.messages]),
        addMessage: wrap(
          s.chatHistoryService.addMessage?.bind(s.chatHistoryService),
        ),
        updateMessage: wrap(
          s.chatHistoryService.updateMessage?.bind(s.chatHistoryService),
        ),
        setMessages: wrap(
          s.chatHistoryService.setMessages?.bind(s.chatHistoryService),
        ),
        clearMessages: wrap(
          s.chatHistoryService.clearMessages?.bind(s.chatHistoryService),
        ),
        removeMessage: wrap(
          s.chatHistoryService.removeMessage?.bind(s.chatHistoryService),
        ),
        addProposal: wrap(
          s.chatHistoryService.addProposal?.bind(s.chatHistoryService),
        ),
      },
      contextRetrieval: {
        retrieveContext: wrap(
          s.contextRetrieval.retrieveContext?.bind(s.contextRetrieval),
        ),
        getConsolidatedContext: wrap(
          s.contextRetrieval.getConsolidatedContext?.bind(s.contextRetrieval),
        ),
      },
      imageGeneration: {
        distillVisualPrompt: wrap(
          s.imageGeneration.distillVisualPrompt?.bind(s.imageGeneration),
        ),
        generateImage: wrap(
          s.imageGeneration.generateImage?.bind(s.imageGeneration),
        ),
      },
      textGeneration: {
        expandQuery: (apiKey: string, query: string, history: any[]) =>
          s.textGeneration.expandQuery(
            apiKey,
            query,
            $state.snapshot([...history]),
          ),
        generateResponse: (
          apiKey: string,
          query: string,
          history: any[],
          context: string,
          modelName: string,
          onUpdate: (partial: string) => void,
          demoMode?: boolean,
          categories?: string[],
          options?: {
            requestId?: string;
            vaultId?: string;
            existingEntities?: any[];
            loreEntries?: import("@codex/oracle-engine").LoreEntry[];
            conversationId?: string;
            interactionsEnabled?: boolean;
          },
        ) => {
          const callback = isWorker
            ? Comlink.proxy(onUpdate)
            : (onUpdate as any);

          return s.textGeneration.generateResponse(
            apiKey,
            query,
            $state.snapshot([...history]),
            context,
            modelName,
            callback,
            demoMode,
            categories ? $state.snapshot(categories) : undefined,
            {
              ...options,
              requestId: options?.requestId || undefined,
              vaultId: options?.vaultId || s.vault.activeVaultId || undefined,
              existingEntities: options?.existingEntities
                ? $state.snapshot(options.existingEntities)
                : $state.snapshot(Object.values(s.vault.entities || {})),
            },
          );
        },
        generateStructuredEntity: s.textGeneration.generateStructuredEntity
          ? (
              apiKey: string,
              query: string,
              context: string,
              modelName: string,
              onUpdate: (partial: string) => void,
              categories?: string[],
            ) => {
              const callback = isWorker
                ? Comlink.proxy(onUpdate)
                : (onUpdate as any);
              return s.textGeneration.generateStructuredEntity?.(
                apiKey,
                query,
                context,
                modelName,
                callback,
                categories ? $state.snapshot(categories) : undefined,
              );
            }
          : undefined,
        reviseEntityUpdate: wrap(
          s.textGeneration.reviseEntityUpdate?.bind(s.textGeneration),
        ),
        generatePlotAnalysis: async (
          apiKey: string,
          modelName: string,
          subject: any,
          connectedEntities: any[],
          userQuery: string,
        ) => {
          const entityId = subject?.id as string | undefined;
          if (entityId && plotCache.has(entityId)) {
            return plotCache.get(entityId)!;
          }
          const result = await s.textGeneration.generatePlotAnalysis(
            apiKey,
            modelName,
            $state.snapshot(subject),
            $state.snapshot(connectedEntities),
            userQuery,
          );
          if (entityId) plotCache.set(entityId, result);
          return result;
        },
      },
      searchService: {
        search: s.searchService.search
          ? wrap((query: string, options?: any) =>
              s.searchService.search(query, {
                includeDrafts: true,
                ...options,
              }),
            )
          : undefined,
      },
      diceParser: {
        parse: wrap(s.diceParser.parse?.bind(s.diceParser)),
      },
      diceEngine: {
        execute: wrap(s.diceEngine.execute?.bind(s.diceEngine)),
      },
      diceHistory: {
        addResult: wrap(s.diceHistory.addResult?.bind(s.diceHistory)),
      },
      graph: {
        requestFit: wrap(s.graph.requestFit?.bind(s.graph)),
      },
      undoRedo: {
        pushUndoAction: wrap(s.undoRedo.pushUndoAction?.bind(s.undoRedo)),
      },
      tier: s.tier,
      effectiveApiKey: s.effectiveApiKey,
      modelName: s.modelName,
      imageProvider: s.settings?.imageProvider,
      customImageBaseUrl: s.settings?.customImageBaseUrl,
      customImageApiKey: s.settings?.customImageApiKey,
      customImageModel: s.settings?.customImageModel,
      isDemoMode: s.sessionModeStore.isDemoMode,
      automationPolicy: $state.snapshot(
        s.discoveryPolicyStore.oracleAutomationPolicy,
      ),
      proposeConnectionsForEntity: wrap(
        async (
          entityId: string,
          options?: { apply?: boolean; analysisText?: string },
        ) => {
          const { proposerStore } = await import("../proposer.svelte");
          if (options?.apply) {
            return proposerStore.analyzeAndApplyEntityById(
              entityId,
              options.analysisText,
            );
          }
          return proposerStore.analyzeEntityById(
            entityId,
            false,
            options?.analysisText,
          );
        },
      ),
      logActivity: wrap((event: any) =>
        s.sessionActivity.addEvent?.({
          type: event.type,
          title: event.title,
          entityType: event.entityType,
          entityId: event.entityId,
        }),
      ),
      draftingEngine: s.draftingEngine,
      eventBus: appEventBus,
      nodeMergeService: {
        proposeMerge: wrap(async (request: any) => {
          const { nodeMergeService: nms } =
            await import("../../services/node-merge.service.svelte");
          return nms.proposeMerge(request);
        }),
        executeMerge: wrap(async (finalContent: any, sourceIds: any) => {
          const { nodeMergeService: nms } =
            await import("../../services/node-merge.service.svelte");
          return nms.executeMerge(finalContent, sourceIds);
        }),
      },
      categories: $state.snapshot(s.categories.list),
    } as OracleExecutionContext;
  }
}

import { oracleBridge } from "../cloud-bridge/oracle-bridge";
import * as Comlink from "comlink";
import { browser } from "$app/environment";
import { contextRetrievalService as defaultContextRetrieval } from "../services/ai/context-retrieval.service";
import { textGenerationService as defaultTextGeneration } from "../services/ai/text-generation.service";
import { imageGenerationService as defaultImageGeneration } from "../services/ai/image-generation.service";
import { searchService as defaultSearchService } from "../services/search";
import { entityDb } from "../utils/entity-db";
import { graph as defaultGraph } from "./graph.svelte";
import { vault as defaultVault } from "./vault.svelte";
import { uiStore as defaultUiStore } from "./ui.svelte";
import { sessionActivity } from "../services/SessionActivityService";
import {
  DraftingEngine,
  draftingEngine as defaultDraftingEngine,
  buildRelatedEntityContext,
  ChatHistoryService,
  OracleCommandParser,
  OracleActionExecutor,
  OracleSettingsService,
  UndoRedoService,
  type ChatMessage,
  type UndoableAction,
  type OracleExecutionContext,
  type DiscoveryProposal,
} from "@codex/oracle-engine";
import {
  diceEngine as defaultDiceEngine,
  diceParser as defaultDiceParser,
} from "dice-engine";
import { diceHistory as defaultDiceHistory } from "./dice-history.svelte";
import { categories as defaultCategories } from "./categories.svelte";
import type { TextGenerationService } from "schema";

export type { ChatMessage, UndoableAction };

export class OracleStore {
  // Reactive UI state
  isOpen = $state(false);
  isModal = $state(false);
  isInitialized = $state(false);
  visualizingEntityId = $state<string | null>(null);
  visualizingMessageId = $state<string | null>(null);

  // Dependencies
  private vault: typeof defaultVault;
  private uiStore: typeof defaultUiStore;
  private graph: typeof defaultGraph;
  private diceHistory: typeof defaultDiceHistory;
  private contextRetrieval: typeof defaultContextRetrieval;
  private textGeneration: TextGenerationService;
  private imageGeneration: typeof defaultImageGeneration;
  private searchService: typeof defaultSearchService;
  private diceEngine: typeof defaultDiceEngine;
  private diceParser: typeof defaultDiceParser;
  private sessionActivity: typeof sessionActivity;
  private categories: typeof defaultCategories;
  private draftingEngine: DraftingEngine;

  // Internal Engine Services
  private chatHistoryService: ChatHistoryService;
  private settingsService: OracleSettingsService;
  private undoRedo: UndoRedoService;
  private executor: OracleActionExecutor;
  private eventBus: BroadcastChannel | null = null;

  constructor(
    deps: {
      vault?: typeof defaultVault;
      uiStore?: typeof defaultUiStore;
      graph?: typeof defaultGraph;
      diceHistory?: typeof defaultDiceHistory;
      contextRetrieval?: typeof defaultContextRetrieval;
      textGeneration?: TextGenerationService;
      imageGeneration?: typeof defaultImageGeneration;
      searchService?: typeof defaultSearchService;
      diceEngine?: typeof defaultDiceEngine;
      diceParser?: typeof defaultDiceParser;
      sessionActivity?: typeof sessionActivity;
      categories?: typeof defaultCategories;
      draftingEngine?: DraftingEngine;
      chatHistoryService?: ChatHistoryService;
      settingsService?: OracleSettingsService;
      undoRedo?: UndoRedoService;
      executor?: OracleActionExecutor;
    } = {},
  ) {
    this.vault = deps.vault ?? defaultVault;
    this.uiStore = deps.uiStore ?? defaultUiStore;
    this.graph = deps.graph ?? defaultGraph;
    this.diceHistory = deps.diceHistory ?? defaultDiceHistory;
    this.contextRetrieval = deps.contextRetrieval ?? defaultContextRetrieval;
    this.textGeneration =
      deps.textGeneration ??
      (oracleBridge.isReady ? oracleBridge.textGeneration : defaultTextGeneration);
    this.imageGeneration = deps.imageGeneration ?? defaultImageGeneration;
    this.searchService = deps.searchService ?? defaultSearchService;
    this.diceEngine = deps.diceEngine ?? defaultDiceEngine;
    this.diceParser = deps.diceParser ?? defaultDiceParser;
    this.sessionActivity = deps.sessionActivity ?? sessionActivity;
    this.categories = deps.categories ?? defaultCategories;
    this.draftingEngine =
      deps.draftingEngine ??
      (oracleBridge.isReady ? oracleBridge.draftingEngine : defaultDraftingEngine);

    // Use provided services or defaults
    this.chatHistoryService =
      deps.chatHistoryService ?? new ChatHistoryService();
    this.settingsService = deps.settingsService ?? new OracleSettingsService();
    this.undoRedo = deps.undoRedo ?? new UndoRedoService();
    this.executor =
      deps.executor ?? new OracleActionExecutor(undefined, this.draftingEngine);

    // Initialize Event Bus for Hybrid Communication
    if (browser) {
      this.eventBus = new BroadcastChannel("codex-oracle-events");
      this.eventBus.onmessage = (event) => this.handleWorkerEvent(event.data);
    }
  }

  /**
   * Cleans up resources, including the event bus.
   */
  public terminate() {
    this.eventBus?.close();
    this.eventBus = null;
  }

  private handleWorkerEvent(event: any) {
    if (event.vaultId && event.vaultId !== this.vault.activeVaultId) return;

    switch (event.type) {
      case "ORACLE_ENTITY_DISCOVERED":
        if (event.requestId) {
          void this.chatHistoryService.addProposal(
            event.requestId,
            event.payload,
          );
        }
        break;
      case "ORACLE_ERROR":
        console.error("[OracleWorker] Background Error:", event.payload);
        break;
    }
  }

  async init() {
    if (this.isInitialized) return;

    await this.chatHistoryService.init(entityDb as any);
    await this.settingsService.init(entityDb as any);

    this.isInitialized = true;
  }

  get messages() {
    return this.chatHistoryService?.messages ?? [];
  }

  get settings() {
    return this.settingsService?.settings;
  }

  get apiKey() {
    return this.settings?.apiKey;
  }

  get connectionMode() {
    return this.settings?.connectionMode || "system-proxy";
  }

  get isLoading() {
    return this.settingsService?.isLoading || false;
  }

  get isEnabled() {
    return true; // Oracle is always enabled in this version
  }

  get modelName() {
    return this.settings?.modelName || "gemini-1.5-flash";
  }

  get activeStyleTitle() {
    return this.settingsService?.activeStyleTitle || null;
  }

  get undoStack() {
    return this.undoRedo?.undoStack ?? [];
  }

  get redoStack() {
    return this.undoRedo?.redoStack ?? [];
  }

  get tier() {
    return this.uiStore.aiDisabled ? "lite" : "advanced";
  }

  get effectiveApiKey(): string | null {
    return this.apiKey || null;
  }

  getExecutionContext(): OracleExecutionContext {
    return {
      vaultId: this.vault.activeVaultId,
      vault: this.vault,
      uiStore: this.uiStore,
      chatHistory: this.chatHistoryService,
      contextRetrieval: this.contextRetrieval,
      textGeneration: {
        // Explicitly forward calls to handle proxy enumerable issues (PR Comment #5)
        expandQuery: (apiKey: string, query: string, history: any[]) =>
          this.textGeneration.expandQuery(apiKey, query, history),
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
          },
        ) => {
          // Wrap callback with Comlink.proxy only if we are using the worker bridge
          const callback = oracleBridge.isReady
            ? Comlink.proxy(onUpdate)
            : (onUpdate as any);

          return this.textGeneration.generateResponse(
            apiKey,
            query,
            history,
            context,
            modelName,
            callback,
            demoMode,
            categories,
            {
              ...options,
              requestId: options?.requestId || undefined,
              vaultId: options?.vaultId || this.vault.activeVaultId || undefined,
              existingEntities:
                options?.existingEntities ||
                Object.values(this.vault.entities || {}),
            },
          );
        },
      },
      imageGeneration: this.imageGeneration,
      searchService: this.searchService,
      diceParser: this.diceParser,
      diceEngine: this.diceEngine,
      diceHistory: this.diceHistory,
      graph: this.graph,
      undoRedo: this.undoRedo,
      tier: this.tier,
      effectiveApiKey: this.effectiveApiKey,
      modelName: this.modelName,
      isDemoMode: this.uiStore.isDemoMode,
      automationPolicy: this.uiStore.oracleAutomationPolicy,
      proposeConnectionsForEntity: async (
        entityId: string,
        options?: { apply?: boolean; analysisText?: string },
      ) => {
        const { proposerStore } = await import("./proposer.svelte");
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
      logActivity: (event) =>
        this.sessionActivity.addEvent({
          type: event.type,
          title: event.title,
          entityType: event.entityType,
          entityId: event.entityId,
        }),
      draftingEngine: this.draftingEngine,
      categories: $state.snapshot(this.categories.list),
    } as OracleExecutionContext;
  }

  async undo() {
    await this.undoRedo.undo((action) => {
      if (action?.messageId) {
        const channel = new BroadcastChannel("codex-oracle-sync");
        channel.postMessage({
          type: "UNDO_PERFORMED",
          data: { messageId: action.messageId },
        });
        channel.close();
      }
    });
  }

  async redo() {
    await this.undoRedo.redo();
  }

  async sendMessage(content: string) {
    if (!content.trim()) return;

    const intent = OracleCommandParser.parse(content, this.uiStore.aiDisabled);

    await this.executor.execute(intent, this.getExecutionContext());
  }

  /** Alias for sendMessage used by chat commands */
  async ask(content: string) {
    return this.sendMessage(content);
  }

  async drawEntity(entityId: string) {
    if (this.visualizingEntityId === entityId) return;

    this.visualizingEntityId = entityId;
    try {
      await this.executor.drawEntity(entityId, this.getExecutionContext());
    } finally {
      if (this.visualizingEntityId === entityId) {
        this.visualizingEntityId = null;
      }
    }
  }

  async drawMessage(messageId: string) {
    if (this.visualizingMessageId === messageId) return;

    this.visualizingMessageId = messageId;
    try {
      await this.executor.drawMessage(messageId, this.getExecutionContext());
    } finally {
      if (this.visualizingMessageId === messageId) {
        this.visualizingMessageId = null;
      }
    }
  }

  isVisualizingEntity(entityId: string | null | undefined) {
    return Boolean(entityId && this.visualizingEntityId === entityId);
  }

  isVisualizingMessage(messageId: string | null | undefined) {
    return Boolean(messageId && this.visualizingMessageId === messageId);
  }

  async clearHistory() {
    if (
      await this.uiStore.confirm({
        title: "Clear History",
        message:
          "Are you sure you want to clear your conversation history? This cannot be undone.",
        confirmLabel: "Clear History",
        isDangerous: true,
      })
    ) {
      await this.chatHistoryService.clear();
      this.sessionActivity.clear();
    }
  }

  /** Alias for clearHistory */
  async clearMessages() {
    return this.clearHistory();
  }

  async removeMessage(id: string) {
    await this.chatHistoryService.removeMessage(id);
  }

  async reconcileDiscoveryProposal(proposal: DiscoveryProposal) {
    if (!proposal.entityId) {
      throw new Error("Discovery proposal does not target an existing record.");
    }

    const existing = this.vault.entities[proposal.entityId];
    if (!existing) {
      throw new Error(`Entity ${proposal.entityId} was not found.`);
    }

    if (this.uiStore.aiDisabled || !this.textGeneration.reconcileEntityUpdate) {
      return {
        content: existing.content || proposal.draft.chronicle,
        lore: (existing.lore || "") + "\n\n" + proposal.draft.lore,
      };
    }

    try {
      return await this.textGeneration.reconcileEntityUpdate(
        this.effectiveApiKey || "",
        this.modelName,
        existing,
        {
          chronicle: proposal.draft.chronicle,
          lore: proposal.draft.lore,
        },
        buildRelatedEntityContext({
          entity: existing,
          incoming: {
            chronicle: proposal.draft.chronicle,
            lore: proposal.draft.lore,
          },
          vault: this.vault,
          getConsolidatedContext: (related) =>
            this.contextRetrieval.getConsolidatedContext(related),
        }),
      );
    } catch {
      return {
        content: existing.content || proposal.draft.chronicle,
        lore: (existing.lore || "") + "\n\n" + proposal.draft.lore,
      };
    }
  }

  async proposeConnectionsForEntity(
    entityId: string,
    options?: { apply?: boolean; analysisText?: string },
  ) {
    const { proposerStore } = await import("./proposer.svelte");
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
  }

  async handleDiscoveryConnectionsForEntity(
    entityId: string,
    analysisText?: string,
  ) {
    const mode = this.uiStore.connectionDiscoveryMode;
    if (mode === "off") {
      return 0;
    }

    return this.proposeConnectionsForEntity(entityId, {
      apply: mode === "auto-apply",
      analysisText,
    });
  }

  async startWizard(type: "connection" | "merge") {
    await this.chatHistoryService.startWizard(type);
  }

  async reset() {
    if (this.chatHistoryService) {
      await this.chatHistoryService.setMessages([]);
    }
  }

  pushUndoAction(
    description: string,
    undo: () => Promise<void>,
    messageId?: string,
    redo?: () => Promise<void>,
  ) {
    this.undoRedo.pushUndoAction(description, undo, messageId, redo);
  }

  async updateSettings(settings: any) {
    await this.settingsService.updateSettings(settings);
  }

  async setKey(key: string) {
    await this.settingsService.updateSettings({ apiKey: key });
  }

  async clearKey() {
    await this.settingsService.updateSettings({ apiKey: undefined });
  }

  async updateMessageEntity(messageId: string, entityId: string | null) {
    await this.chatHistoryService.updateMessage(messageId, {
      entityId: entityId || undefined,
    });
  }

  toggle() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.init();
    }
  }

  toggleModal() {
    this.isModal = !this.isModal;
    if (!this.isOpen) {
      this.open(this.isModal);
    }
  }

  open(modal = false) {
    this.isOpen = true;
    this.isModal = modal;
    this.init();
  }

  close() {
    this.isOpen = false;
    this.isModal = false;
  }

  // Test-only image helper
  async addTestImageMessage(
    content: string,
    imageUrl: string,
    imageBlob: Blob,
    entityId?: string,
  ) {
    await this.chatHistoryService.addTestImageMessage(
      content,
      imageUrl,
      imageBlob,
      entityId,
    );
  }
}

const ORACLE_KEY = "__codex_oracle_instance__";
export const oracle: OracleStore =
  (globalThis as any)[ORACLE_KEY] ??
  ((globalThis as any)[ORACLE_KEY] = new OracleStore());

if (typeof window !== "undefined") {
  (window as any).oracle = oracle;
}

import { oracleBridge } from "../cloud-bridge/oracle-bridge";
import { contextRetrievalService as defaultContextRetrieval } from "../services/ai/context-retrieval.service";
import { textGenerationService as defaultTextGeneration } from "../services/ai/text-generation.service.svelte";
import { imageGenerationService as defaultImageGeneration } from "../services/ai/image-generation.service";
import { searchService as defaultSearchService } from "@codex/search-orchestrator";
import { entityDb } from "../utils/entity-db";
import { graph as defaultGraph } from "./graph.svelte";
import { vault as defaultVault } from "./vault.svelte";
import { themeStore as defaultThemeStore } from "./theme.svelte";
import { sessionActivity } from "../services/SessionActivityService";
import {
  DraftingEngine,
  draftingEngine as defaultDraftingEngine,
  ChatHistoryService,
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
import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { notificationStore } from "$lib/stores/ui/notification.svelte";

import {
  type EntityRevisionRequest,
  type EntityRevisionResult,
  type IOracleStore,
} from "./oracle/types";
import { OracleUiManager } from "./oracle/ui-manager.svelte";
import { OracleChatManager } from "./oracle/chat-manager.svelte";
import { OracleContextManager } from "./oracle/context-manager.svelte";
import { OracleActionManager } from "./oracle/action-manager.svelte";
import { OracleSettingsManager } from "./oracle/settings-manager.svelte";
import { OracleRevisionManager } from "./oracle/revision-manager.svelte";

export type { ChatMessage, UndoableAction };

export class OracleStore implements IOracleStore {
  // Managers
  ui: OracleUiManager;
  chat: OracleChatManager;
  context: OracleContextManager;
  actions: OracleActionManager;
  settingsManager: OracleSettingsManager;
  revision: OracleRevisionManager;

  // Reactive UI state
  get isOpen() {
    return this.ui.isOpen;
  }
  set isOpen(v) {
    this.ui.isOpen = v;
  }

  get isModal() {
    return this.ui.isModal;
  }
  set isModal(v) {
    this.ui.isModal = v;
  }

  isInitialized = $state(false);

  get isThinking() {
    return this.ui.isThinking;
  }

  get visualizingEntityId() {
    return this.ui.visualizingEntityId;
  }
  set visualizingEntityId(v) {
    this.ui.visualizingEntityId = v;
  }

  get visualizingMessageId() {
    return this.ui.visualizingMessageId;
  }
  set visualizingMessageId(v) {
    this.ui.visualizingMessageId = v;
  }

  // Dependencies
  private _vault?: typeof defaultVault;
  private _discoveryPolicyStore?: any;
  private _sessionModeStore?: any;
  private _themeStore?: typeof defaultThemeStore;
  private _graph?: typeof defaultGraph;
  private _diceHistory?: typeof defaultDiceHistory;
  private _contextRetrieval?: typeof defaultContextRetrieval;
  private _textGeneration?: TextGenerationService;
  private _imageGeneration?: typeof defaultImageGeneration;
  private _searchService?: typeof defaultSearchService;
  private _diceEngine?: typeof defaultDiceEngine;
  private _diceParser?: typeof defaultDiceParser;
  private _sessionActivity?: typeof sessionActivity;
  private _categories?: typeof defaultCategories;
  private _draftingEngine?: DraftingEngine;

  get vault() {
    return this._vault ?? defaultVault;
  }
  get discoveryPolicyStore() {
    return this._discoveryPolicyStore ?? discoveryPolicyStore;
  }
  get sessionModeStore() {
    return this._sessionModeStore ?? sessionModeStore;
  }
  get notificationStore() {
    return notificationStore;
  }
  get sessionActivity() {
    return this._sessionActivity ?? sessionActivity;
  }
  get themeStore() {
    return this._themeStore ?? defaultThemeStore;
  }
  get graph() {
    return this._graph ?? defaultGraph;
  }
  get contextRetrieval() {
    return this._contextRetrieval ?? defaultContextRetrieval;
  }
  get imageGeneration() {
    return this._imageGeneration ?? defaultImageGeneration;
  }
  get searchService() {
    return this._searchService ?? defaultSearchService;
  }
  get diceParser() {
    return this._diceParser ?? defaultDiceParser;
  }
  get diceEngine() {
    return this._diceEngine ?? defaultDiceEngine;
  }
  get diceHistory() {
    return this._diceHistory ?? defaultDiceHistory;
  }
  get categories() {
    return this._categories ?? defaultCategories;
  }

  get draftingEngine() {
    return (
      this._draftingEngine ??
      (oracleBridge.isReady
        ? (oracleBridge.draftingEngine as any)
        : defaultDraftingEngine)
    );
  }
  get textGeneration(): TextGenerationService {
    return (
      this._textGeneration ??
      (oracleBridge.isReady
        ? (oracleBridge.textGeneration as any)
        : defaultTextGeneration)
    );
  }

  // Internal Engine Services
  chatHistoryService: ChatHistoryService;
  settingsService: OracleSettingsService;
  undoRedo: UndoRedoService;
  executor: OracleActionExecutor;
  private eventBus: BroadcastChannel | null = null;
  private vaultSwitchedHandler: ((e: Event) => void) | null = null;

  constructor(
    deps: {
      vault?: typeof defaultVault;
      discoveryPolicyStore?: any;
      sessionModeStore?: any;
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
      // Manager injections for testing
      ui?: OracleUiManager;
      chat?: OracleChatManager;
      context?: OracleContextManager;
      actions?: OracleActionManager;
      settingsManager?: OracleSettingsManager;
      revision?: OracleRevisionManager;
    } = {},
  ) {
    this._vault = deps.vault;
    this._discoveryPolicyStore = deps.discoveryPolicyStore;
    this._sessionModeStore = deps.sessionModeStore;
    this._graph = deps.graph;
    this._diceHistory = deps.diceHistory;
    this._contextRetrieval = deps.contextRetrieval;
    this._textGeneration = deps.textGeneration;
    this._imageGeneration = deps.imageGeneration;
    this._searchService = deps.searchService;
    this._diceEngine = deps.diceEngine;
    this._diceParser = deps.diceParser;
    this._sessionActivity = deps.sessionActivity;
    this._categories = deps.categories;
    this._draftingEngine = deps.draftingEngine;

    // Use provided services or defaults
    this.chatHistoryService =
      deps.chatHistoryService ?? new ChatHistoryService();
    this.settingsService = deps.settingsService ?? new OracleSettingsService();
    this.undoRedo = deps.undoRedo ?? new UndoRedoService();
    this.executor =
      deps.executor ?? new OracleActionExecutor(undefined, this.draftingEngine);

    // Initialize Managers
    this.ui = deps.ui ?? new OracleUiManager(this);
    this.chat = deps.chat ?? new OracleChatManager(this);
    this.context = deps.context ?? new OracleContextManager(this);
    this.actions = deps.actions ?? new OracleActionManager(this);
    this.settingsManager =
      deps.settingsManager ?? new OracleSettingsManager(this);
    this.revision = deps.revision ?? new OracleRevisionManager(this);

    // Initialize Event Bus for Hybrid Communication
    if (
      typeof window !== "undefined" &&
      typeof BroadcastChannel !== "undefined"
    ) {
      this.eventBus = new BroadcastChannel("codex-oracle-events");
      this.eventBus.onmessage = (event) => this.handleWorkerEvent(event.data);
    }

    // Reload chat history when the active vault changes
    if (typeof window !== "undefined") {
      this.vaultSwitchedHandler = (e: Event) => {
        const newVaultId = (e as CustomEvent<{ id: string }>).detail?.id;
        if (newVaultId && this.chat.isChatHistoryReady) {
          void this.chat.switchVault(newVaultId);
        }
      };
      window.addEventListener("vault-switched", this.vaultSwitchedHandler);
    }
  }

  /**
   * Cleans up resources, including the event bus.
   */
  public destroy() {
    this.eventBus?.close();
    this.eventBus = null;
    this.chat.destroy();
    if (this.vaultSwitchedHandler && typeof window !== "undefined") {
      window.removeEventListener("vault-switched", this.vaultSwitchedHandler);
      this.vaultSwitchedHandler = null;
    }
  }

  private handleWorkerEvent(event: any) {
    if (event.vaultId && event.vaultId !== this.vault.activeVaultId) return;

    switch (event.type) {
      case "ORACLE_THINKING_START":
        this.ui.updateThinking(1);
        break;
      case "ORACLE_THINKING_END":
        this.ui.updateThinking(-1);
        break;
      case "ORACLE_ENTITY_DISCOVERED":
        if (event.requestId) {
          void this.chat.addProposal(event.requestId, event.payload);
        }
        break;
      case "ORACLE_ERROR":
        console.error("[OracleWorker] Background Error:", event.payload);
        break;
    }
  }

  async init() {
    if (this.isInitialized) return;

    await this.chat.init(
      entityDb as any,
      this.vault.activeVaultId ?? "default",
    );
    await this.settingsManager.init(entityDb as any);

    this.isInitialized = true;
  }

  async loadForVault(vaultId: string) {
    if (!this.isInitialized) {
      return this.init();
    }
    await this.chat.switchVault(vaultId);
  }

  get messages() {
    return this.chat.messages;
  }

  async setMessages(messages: ChatMessage[]) {
    await this.chatHistoryService.setMessages(messages);
  }

  get settings() {
    return this.settingsManager.settings;
  }

  get apiKey() {
    return this.settingsManager.apiKey;
  }

  get connectionMode() {
    return this.settingsManager.connectionMode;
  }

  get isLoading() {
    return this.settingsManager.isLoading;
  }

  get isEnabled() {
    return true; // Oracle is always enabled in this version
  }

  get modelName() {
    return this.settingsManager.modelName;
  }

  get activeStyleTitle() {
    return this.settingsManager.activeStyleTitle;
  }

  get undoStack() {
    return this.actions.undoStack;
  }

  get redoStack() {
    return this.actions.redoStack;
  }

  get tier() {
    return this.settingsManager.tier;
  }

  get effectiveApiKey(): string | null {
    return this.apiKey || null;
  }

  getExecutionContext(): OracleExecutionContext {
    return this.context.getExecutionContext();
  }

  async undo() {
    await this.actions.undo();
  }

  async redo() {
    await this.actions.redo();
  }

  async sendMessage(content: string) {
    await this.chat.sendMessage(content);
  }

  /** Alias for sendMessage used by chat commands */
  async ask(content: string) {
    await this.chat.ask(content);
  }

  async drawEntity(entityId: string) {
    await this.actions.drawEntity(entityId);
  }

  async drawMessage(messageId: string) {
    await this.actions.drawMessage(messageId);
  }

  async generateEntityFromPrompt(entityId: string, prompt: string) {
    await this.actions.generateEntityFromPrompt(entityId, prompt);
  }

  async generateMessageFromPrompt(messageId: string, prompt: string) {
    await this.actions.generateMessageFromPrompt(messageId, prompt);
  }

  async regenerateEntityPrompt(entityId: string): Promise<string | null> {
    return this.actions.regenerateEntityPrompt(entityId);
  }

  async regenerateMessagePrompt(messageId: string): Promise<string | null> {
    return this.actions.regenerateMessagePrompt(messageId);
  }

  isVisualizingEntity(entityId: string | null | undefined) {
    return this.ui.isVisualizingEntity(entityId);
  }

  isVisualizingMessage(messageId: string | null | undefined) {
    return this.ui.isVisualizingMessage(messageId);
  }

  async clearMessages() {
    await this.chat.clearMessages();
  }

  async removeMessage(id: string) {
    await this.chat.removeMessage(id);
  }

  async reviseEntity(
    request: EntityRevisionRequest,
  ): Promise<EntityRevisionResult> {
    return this.revision.reviseEntity(request);
  }

  async reviseSmartApply(
    entityId: string,
    incoming: { chronicle?: string; lore?: string },
  ): Promise<{ content?: string; lore?: string; categoryId?: string }> {
    return this.revision.reviseSmartApply(entityId, incoming);
  }

  async reviseDiscoveryProposal(proposal: DiscoveryProposal) {
    return this.revision.reviseDiscoveryProposal(proposal);
  }

  async reviseNewEntityDraft(
    title: string,
    type: string,
    draft: { chronicle: string; lore: string },
  ): Promise<{ content: string; lore: string; categoryId?: string }> {
    return this.revision.reviseNewEntityDraft(title, type, draft);
  }

  async proposeConnectionsForEntity(
    entityId: string,
    options?: { apply?: boolean; analysisText?: string },
  ) {
    return this.revision.proposeConnectionsForEntity(entityId, options);
  }

  async handleDiscoveryConnectionsForEntity(
    entityId: string,
    analysisText?: string,
  ) {
    return this.revision.handleDiscoveryConnectionsForEntity(
      entityId,
      analysisText,
    );
  }

  async startWizard(type: "connection" | "merge") {
    await this.chat.startWizard(type);
  }

  async reset() {
    await this.chat.reset();
  }

  pushUndoAction(
    description: string,
    undo: () => Promise<void>,
    messageId?: string,
    redo?: () => Promise<void>,
  ) {
    this.actions.pushUndoAction(description, undo, messageId, redo);
  }

  async updateSettings(settings: any) {
    await this.settingsManager.updateSettings(settings);
  }

  async setKey(key: string) {
    await this.settingsManager.setKey(key);
  }

  async setTier(tier: "lite" | "advanced") {
    await this.settingsManager.setTier(tier);
  }

  async clearKey() {
    await this.settingsManager.clearKey();
  }

  async updateMessageEntity(messageId: string, entityId: string | null) {
    await this.chat.updateMessageEntity(messageId, entityId);
  }

  toggle() {
    this.ui.toggle();
  }

  toggleModal() {
    this.ui.toggleModal();
  }

  open(modal = false) {
    this.ui.open(modal);
  }

  close() {
    this.ui.close();
  }

  // Test-only image helper
  async addTestImageMessage(
    content: string,
    imageUrl: string,
    imageBlob: Blob,
    entityId?: string,
  ) {
    await this.chat.addTestImageMessage(content, imageUrl, imageBlob, entityId);
  }
}

const ORACLE_KEY = "__codex_oracle_instance__";
export const oracle: OracleStore =
  (globalThis as any)[ORACLE_KEY] ??
  ((globalThis as any)[ORACLE_KEY] = new OracleStore());

if (typeof window !== "undefined") {
  (window as any).oracle = oracle;
}

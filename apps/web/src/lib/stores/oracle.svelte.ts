import { contextRetrievalService as defaultContextRetrieval } from "../services/ai/context-retrieval.service";
import { textGenerationService as defaultTextGeneration } from "../services/ai/text-generation.service";
import { imageGenerationService as defaultImageGeneration } from "../services/ai/image-generation.service";
import { entityDb } from "../utils/entity-db";
import { graph as defaultGraph } from "./graph.svelte";
import { vault as defaultVault } from "./vault.svelte";
import { uiStore as defaultUiStore } from "./ui.svelte";
import { sessionActivity } from "../services/SessionActivityService";
import {
  DraftingEngine,
  draftingEngine as defaultDraftingEngine,
  ChatHistoryService,
  OracleCommandParser,
  OracleActionExecutor,
  OracleSettingsService,
  UndoRedoService,
  type ChatMessage,
  type UndoableAction,
  type OracleExecutionContext,
} from "@codex/oracle-engine";
import {
  diceEngine as defaultDiceEngine,
  diceParser as defaultDiceParser,
} from "dice-engine";
import { diceHistory as defaultDiceHistory } from "./dice-history.svelte";

export type { ChatMessage, UndoableAction };

export class OracleStore {
  // Reactive UI state
  isOpen = $state(false);
  isModal = $state(false);
  isInitialized = $state(false);

  // Dependencies
  private vault: typeof defaultVault;
  private uiStore: typeof defaultUiStore;
  private graph: typeof defaultGraph;
  private diceHistory: typeof defaultDiceHistory;
  private contextRetrieval: typeof defaultContextRetrieval;
  private textGeneration: typeof defaultTextGeneration;
  private imageGeneration: typeof defaultImageGeneration;
  private diceEngine: typeof defaultDiceEngine;
  private diceParser: typeof defaultDiceParser;
  private sessionActivity: typeof sessionActivity;
  private draftingEngine: DraftingEngine;

  // Internal Engine Services
  private chatHistoryService: ChatHistoryService;
  private settingsService: OracleSettingsService;
  private undoRedo: UndoRedoService;
  private executor: OracleActionExecutor;

  constructor(
    deps: {
      vault?: typeof defaultVault;
      uiStore?: typeof defaultUiStore;
      graph?: typeof defaultGraph;
      diceHistory?: typeof defaultDiceHistory;
      contextRetrieval?: typeof defaultContextRetrieval;
      textGeneration?: typeof defaultTextGeneration;
      imageGeneration?: typeof defaultImageGeneration;
      diceEngine?: typeof defaultDiceEngine;
      diceParser?: typeof defaultDiceParser;
      sessionActivity?: typeof sessionActivity;
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
    this.textGeneration = deps.textGeneration ?? defaultTextGeneration;
    this.imageGeneration = deps.imageGeneration ?? defaultImageGeneration;
    this.diceEngine = deps.diceEngine ?? defaultDiceEngine;
    this.diceParser = deps.diceParser ?? defaultDiceParser;
    this.sessionActivity = deps.sessionActivity ?? sessionActivity;
    this.draftingEngine = deps.draftingEngine ?? defaultDraftingEngine;

    // Use provided services or defaults
    this.chatHistoryService =
      deps.chatHistoryService ?? new ChatHistoryService();
    this.settingsService = deps.settingsService ?? new OracleSettingsService();
    this.undoRedo = deps.undoRedo ?? new UndoRedoService();
    this.executor =
      deps.executor ?? new OracleActionExecutor(undefined, this.draftingEngine);
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
      textGeneration: this.textGeneration,
      imageGeneration: this.imageGeneration,
      diceParser: this.diceParser,
      diceEngine: this.diceEngine,
      diceHistory: this.diceHistory,
      graph: this.graph,
      undoRedo: this.undoRedo,
      tier: this.tier,
      effectiveApiKey: this.effectiveApiKey,
      modelName: this.modelName,
      isDemoMode: this.uiStore.isDemoMode,
      logActivity: (event) =>
        this.sessionActivity.addEvent({
          type: event.type,
          title: event.title,
          entityType: event.entityType,
          entityId: event.entityId,
        }),
      draftingEngine: this.draftingEngine,
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
    await this.executor.execute(
      { type: "plot", entityId },
      this.getExecutionContext(),
    );
  }

  async drawMessage(messageId: string) {
    await this.executor.execute(
      { type: "plot", entityId: messageId },
      this.getExecutionContext(),
    );
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

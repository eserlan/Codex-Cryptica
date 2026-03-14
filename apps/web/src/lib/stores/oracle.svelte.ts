import { contextRetrievalService } from "../services/ai/context-retrieval.service";
import { textGenerationService } from "../services/ai/text-generation.service";
import { imageGenerationService } from "../services/ai/image-generation.service";
import { getDB } from "../utils/idb";
import { graph } from "./graph.svelte";
import { vault } from "./vault.svelte";
import { uiStore } from "./ui.svelte";
import { diceEngine, diceParser } from "dice-engine";
import { diceHistory } from "./dice-history.svelte";
import {
  ChatHistoryService,
  OracleCommandParser,
  OracleActionExecutor,
  OracleSettingsService,
  UndoRedoService,
  type ChatMessage,
  type UndoableAction,
  type OracleExecutionContext,
} from "@codex/oracle-engine";

export type { ChatMessage, UndoableAction };

export class OracleStore {
  // Reactive UI state
  isOpen = $state(false);
  isModal = $state(false);
  isInitialized = $state(false);

  constructor(
    private chatHistory = new ChatHistoryService(),
    private settings = new OracleSettingsService(),
    private undoRedo = new UndoRedoService(),
    private executor = new OracleActionExecutor(),
  ) {
    if (typeof window !== "undefined") {
      diceHistory.init();
      window.addEventListener("vault-switched", () => this.clearMessages());
    }
  }

  // Delegated getters
  get messages() {
    return this.chatHistory.messages;
  }
  get lastUpdated() {
    return this.chatHistory.lastUpdated;
  }

  get apiKey() {
    return this.settings.apiKey;
  }
  get tier() {
    return this.settings.tier;
  }
  get isLoading() {
    return this.settings.isLoading;
  }
  get activeStyleTitle() {
    return this.settings.activeStyleTitle;
  }
  get effectiveApiKey() {
    return this.settings.effectiveApiKey;
  }
  get isEnabled() {
    return this.settings.isEnabled;
  }

  get undoStack() {
    return this.undoRedo.undoStack;
  }
  get redoStack() {
    return this.undoRedo.redoStack;
  }
  get isUndoing() {
    return this.undoRedo.isUndoing;
  }

  async init() {
    if (this.isInitialized) return;
    const db = await getDB();
    await this.settings.init(db);
    await this.chatHistory.init(db);
    this.isInitialized = true;
  }

  async ask(query: string) {
    if (!query.trim()) return;
    const key = this.effectiveApiKey;
    if (
      !key &&
      !uiStore.liteMode &&
      !query.toLowerCase().trim().startsWith("/roll")
    )
      return;

    this.settings.setLoading(true);
    try {
      const { searchService } = await import("../services/search");
      const { nodeMergeService } =
        await import("../services/node-merge.service");
      const intent = OracleCommandParser.parse(query, uiStore.liteMode);

      await this.executor.execute(
        intent,
        this.getExecutionContext(searchService, nodeMergeService),
        (partial) => {
          const msgs = [...this.messages];
          if (msgs.length > 0) {
            msgs[msgs.length - 1].content = partial;
            this.chatHistory.setMessages(msgs);
          }
        },
      );
    } finally {
      this.settings.setLoading(false);
    }
  }

  async drawEntity(entityId: string) {
    if (!this.effectiveApiKey || this.isLoading) return;
    this.settings.setLoading(true);
    try {
      await this.executor.drawEntity(entityId, this.getExecutionContext());
    } finally {
      this.settings.setLoading(false);
    }
  }

  async drawMessage(messageId: string) {
    if (!this.effectiveApiKey || this.isLoading) return;
    this.settings.setLoading(true);
    try {
      await this.executor.drawMessage(messageId, this.getExecutionContext());
    } finally {
      this.settings.setLoading(false);
    }
  }

  private getExecutionContext(
    searchService: any = null,
    nodeMergeService: any = null,
  ): OracleExecutionContext {
    return {
      vault,
      textGeneration: textGenerationService,
      imageGeneration: imageGenerationService,
      contextRetrieval: contextRetrievalService,
      diceEngine,
      diceParser,
      diceHistory,
      searchService,
      nodeMergeService,
      uiStore,
      graph,
      chatHistory: this.chatHistory,
      undoRedo: this.undoRedo,
      tier: this.tier,
      effectiveApiKey: this.effectiveApiKey,
      modelName: this.settings.modelName,
      isDemoMode: uiStore.isDemoMode,
    };
  }

  async undo() {
    const actionBefore = this.undoStack[this.undoStack.length - 1];
    await this.undoRedo.undo();
    if (actionBefore)
      await this.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content: `↩️ Undid: **${actionBefore.description}**`,
      });
  }

  async redo() {
    const actionBefore = this.redoStack[this.redoStack.length - 1];
    await this.undoRedo.redo();
    if (actionBefore)
      await this.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content: `🔄 Redid: **${actionBefore.description}**`,
      });
  }

  pushUndoAction(
    description: string,
    undo: () => Promise<void>,
    messageId?: string,
    redo?: () => Promise<void>,
  ) {
    this.undoRedo.pushUndoAction(description, undo, messageId, redo);
  }

  async setTier(tier: "lite" | "advanced") {
    await this.settings.setTier(tier);
  }
  async setKey(key: string) {
    await this.settings.setKey(key);
  }
  async clearKey() {
    await this.settings.clearKey();
    await this.clearMessages();
  }

  toggle() {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.apiKey === null) this.init();
  }
  toggleModal() {
    this.isModal = !this.isModal;
  }

  // Domain delegations
  clearMessages() {
    this.chatHistory.clearMessages();
  }
  removeMessage(id: string) {
    this.chatHistory.removeMessage(id);
  }
  startWizard(type: "connection" | "merge") {
    this.chatHistory.startWizard(type);
  }
  updateMessageEntity(id: string, ent: string | null) {
    this.chatHistory.updateMessageEntity(id, ent);
  }
  addTestImageMessage(c: string, u: string, b: Blob, e?: string) {
    this.chatHistory.addTestImageMessage(c, u, b, e);
  }

  setMessages(messages: ChatMessage[]) {
    this.chatHistory.setMessages(messages);
  }

  reset() {
    this.chatHistory.setMessages([]);
    this.undoRedo.clear();
    this.settings.clearKey();
    this.isOpen = false;
    this.settings.setLoading(false);
  }
}

export const oracle = new OracleStore();

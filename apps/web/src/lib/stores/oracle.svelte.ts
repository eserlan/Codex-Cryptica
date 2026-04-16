import { contextRetrievalService as defaultContextRetrieval } from "../services/ai/context-retrieval.service";
import { textGenerationService as defaultTextGeneration } from "../services/ai/text-generation.service";
import { imageGenerationService as defaultImageGeneration } from "../services/ai/image-generation.service";
import { entityDb } from "../utils/entity-db";
import { graph as defaultGraph } from "./graph.svelte";
import { vault as defaultVault } from "./vault.svelte";
import { uiStore as defaultUiStore } from "./ui.svelte";
import {
  diceEngine as defaultDiceEngine,
  diceParser as defaultDiceParser,
} from "dice-engine";
import { diceHistory as defaultDiceHistory } from "./dice-history.svelte";
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

  constructor(
    private chatHistory = new ChatHistoryService(),
    private settings = new OracleSettingsService(),
    private undoRedo = new UndoRedoService(),
    private executor = new OracleActionExecutor(),
    vault: typeof defaultVault = defaultVault,
    uiStore: typeof defaultUiStore = defaultUiStore,
    graph: typeof defaultGraph = defaultGraph,
    diceHistory: typeof defaultDiceHistory = defaultDiceHistory,
    contextRetrieval: typeof defaultContextRetrieval = defaultContextRetrieval,
    textGeneration: typeof defaultTextGeneration = defaultTextGeneration,
    imageGeneration: typeof defaultImageGeneration = defaultImageGeneration,
    diceEngine: typeof defaultDiceEngine = defaultDiceEngine,
    diceParser: typeof defaultDiceParser = defaultDiceParser,
  ) {
    this.vault = vault;
    this.uiStore = uiStore;
    this.graph = graph;
    this.diceHistory = diceHistory;
    this.contextRetrieval = contextRetrieval;
    this.textGeneration = textGeneration;
    this.imageGeneration = imageGeneration;
    this.diceEngine = diceEngine;
    this.diceParser = diceParser;

    if (typeof window !== "undefined") {
      this.diceHistory.init();
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
  get connectionMode() {
    return this.settings.connectionMode;
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

  get modelName() {
    return this.settings.modelName;
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
    await this.settings.init(entityDb);
    await this.chatHistory.init(entityDb);
    this.isInitialized = true;
  }

  /**
   * Cleanup method to revoke blob URLs and prevent memory leaks.
   * Should be called when the application unloads.
   */
  destroy() {
    this.chatHistory.destroy();
  }

  async ask(query: string) {
    if (!query.trim()) return;

    // Allow utility commands to function even if AI is disabled.
    // The executor will handle informing the user if they try to use an AI intent while disabled.
    const q = query.toLowerCase().trim();
    const isUtility =
      q.startsWith("/") &&
      ["/help", "/clear", "/roll", "/create", "/connect", "/merge"].some(
        (cmd) => q.startsWith(cmd),
      );

    if (!this.effectiveApiKey && this.uiStore.aiDisabled && !isUtility) {
      return;
    }

    this.settings.setLoading(true);
    try {
      const { searchService } = await import("../services/search");
      const { nodeMergeService } =
        await import("../services/node-merge.service");
      const intent = OracleCommandParser.parse(query, this.uiStore.aiDisabled);

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
    } catch (err: any) {
      console.error("[OracleStore] Ask failed:", err);

      // Stale chunk: browser has old HTML referencing a chunk hash that no
      // longer exists on the server (happens after a deployment while the
      // previous page is still open).  Force a full reload so the user gets
      // fresh HTML + matching chunks.
      if (
        typeof err?.message === "string" &&
        err.message.includes("Failed to fetch dynamically imported module")
      ) {
        await this.chatHistory.addMessage({
          id: crypto.randomUUID(),
          role: "system",
          content:
            "⟳ A new version of the app was deployed. Reloading to apply the update…",
        });
        this.settings.setLoading(false);
        setTimeout(() => location.reload(), 1500);
        return;
      }

      await this.chatHistory.addMessage({
        id: crypto.randomUUID(),
        role: "system",
        content: `❌ Error: ${err.message || "Failed to generate response"}`,
      });
    } finally {
      this.settings.setLoading(false);
    }
  }

  async drawEntity(entityId: string) {
    if ((!this.effectiveApiKey && this.uiStore.aiDisabled) || this.isLoading)
      return;
    this.settings.setLoading(true);
    try {
      await this.executor.drawEntity(entityId, this.getExecutionContext());
    } finally {
      this.settings.setLoading(false);
    }
  }

  async drawMessage(messageId: string) {
    if ((!this.effectiveApiKey && this.uiStore.aiDisabled) || this.isLoading)
      return;
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
      vault: this.vault,
      textGeneration: this.textGeneration,
      imageGeneration: this.imageGeneration,
      contextRetrieval: this.contextRetrieval,
      diceEngine: this.diceEngine,
      diceParser: this.diceParser,
      diceHistory: this.diceHistory,
      searchService,
      nodeMergeService,
      uiStore: this.uiStore,
      graph: this.graph,
      chatHistory: this.chatHistory,
      undoRedo: this.undoRedo,
      tier: this.tier,
      effectiveApiKey: this.effectiveApiKey,
      modelName: this.settings.modelName,
      isDemoMode: this.uiStore.isDemoMode,
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

const ORACLE_KEY = "__codex_oracle_instance__";
export const oracle: OracleStore =
  (globalThis as any)[ORACLE_KEY] ??
  ((globalThis as any)[ORACLE_KEY] = new OracleStore());

if (typeof window !== "undefined") {
  (window as any).oracle = oracle;
}

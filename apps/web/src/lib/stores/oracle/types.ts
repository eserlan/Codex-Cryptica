import type {
  ChatMessage,
  DiscoveryProposal,
  OracleExecutionContext,
  ChatHistoryService,
  OracleSettingsService,
  UndoRedoService,
  OracleActionExecutor,
  DraftingEngine,
} from "@codex/oracle-engine";
import type { TextGenerationService } from "schema";

export type OracleUiSnapshot = {
  aiDisabled: boolean;
  isDemoMode: boolean;
  entityDiscoveryMode?: string;
  connectionDiscoveryMode?: string;
  autoArchive?: boolean;
  activeThemeId?: string;
};

export interface IOracleStore {
  // Reactive UI state
  isOpen: boolean;
  isModal: boolean;
  isInitialized: boolean;
  isThinking: boolean;
  visualizingEntityId: string | null;
  visualizingMessageId: string | null;

  // Getters
  readonly messages: ChatMessage[];
  readonly settings: any;
  readonly apiKey: string | undefined;
  readonly connectionMode: string;
  readonly isLoading: boolean;
  readonly isEnabled: boolean;
  readonly modelName: string;
  readonly activeStyleTitle: string | null;
  readonly undoStack: any[];
  readonly redoStack: any[];
  readonly tier: "lite" | "advanced";
  readonly effectiveApiKey: string | null;

  // Internal Engine Services (Exposed for managers)
  readonly chatHistoryService: ChatHistoryService;
  readonly settingsService: OracleSettingsService;
  readonly undoRedo: UndoRedoService;
  readonly executor: OracleActionExecutor;
  readonly draftingEngine: DraftingEngine;
  readonly textGeneration: TextGenerationService;

  // Shared UI/State stores
  readonly vault: any;
  readonly discoveryPolicyStore: any;
  readonly sessionModeStore: any;
  readonly notificationStore: any;
  readonly sessionActivity: any;
  readonly themeStore: any;
  readonly graph: any;
  readonly contextRetrieval: any;
  readonly imageGeneration: any;
  readonly searchService: any;
  readonly diceParser: any;
  readonly diceEngine: any;
  readonly diceHistory: any;
  readonly categories: any;

  // Managers (Internal access)
  readonly ui: any;
  readonly chat: any;
  readonly context: any;
  readonly actions: any;
  readonly settingsManager: any;
  readonly reconciliation: any;

  // Lifecycle
  init(): Promise<void>;
  loadForVault(vaultId: string): Promise<void>;
  destroy(): void;

  // Context
  getExecutionContext(): OracleExecutionContext;

  // Actions
  undo(): Promise<void>;
  redo(): Promise<void>;
  sendMessage(content: string): Promise<void>;
  ask(content: string): Promise<void>;
  regenerate(
    entityId: string,
    onPartial?: (partial: string) => void,
  ): Promise<void>;
  drawEntity(entityId: string): Promise<void>;
  drawMessage(messageId: string): Promise<void>;
  generateEntityFromPrompt(entityId: string, prompt: string): Promise<void>;
  generateMessageFromPrompt(messageId: string, prompt: string): Promise<void>;
  regenerateEntityPrompt(entityId: string): Promise<string | null>;
  regenerateMessagePrompt(messageId: string): Promise<string | null>;
  isVisualizingEntity(entityId: string | null | undefined): boolean;
  isVisualizingMessage(messageId: string | null | undefined): boolean;
  clearMessages(): Promise<void>;
  removeMessage(id: string): Promise<void>;
  startWizard(type: "connection" | "merge"): Promise<void>;
  reset(): Promise<void>;
  pushUndoAction(
    description: string,
    undo: () => Promise<void>,
    messageId?: string,
    redo?: () => Promise<void>,
  ): void;

  // Settings
  updateSettings(settings: any): Promise<void>;
  setKey(key: string): Promise<void>;
  clearKey(): Promise<void>;

  // Reconciliation
  reconcileSmartApply(
    entityId: string,
    incoming: { chronicle?: string; lore?: string },
  ): Promise<{ content?: string; lore?: string; categoryId?: string }>;
  reconcileDiscoveryProposal(
    proposal: DiscoveryProposal,
  ): Promise<{ content: string; lore: string }>;
  reconcileNewEntityDraft(
    title: string,
    type: string,
    draft: { chronicle: string; lore: string },
  ): Promise<{ content: string; lore: string; categoryId?: string }>;

  // Connections
  proposeConnectionsForEntity(
    entityId: string,
    options?: { apply?: boolean; analysisText?: string },
  ): Promise<any>;
  handleDiscoveryConnectionsForEntity(
    entityId: string,
    analysisText?: string,
  ): Promise<number>;

  // UI
  toggle(): void;
  toggleModal(): void;
  open(modal?: boolean): void;
  close(): void;

  // Chat Helpers
  updateMessageEntity(
    messageId: string,
    entityId: string | null,
  ): Promise<void>;
  addTestImageMessage(
    content: string,
    imageUrl: string,
    imageBlob: Blob,
    entityId?: string,
  ): Promise<void>;
}

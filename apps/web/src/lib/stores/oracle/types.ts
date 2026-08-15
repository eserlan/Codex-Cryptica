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
import type { TextGenerationService, AspectRatio } from "schema";
import type { AdventureManager } from "./adventure-manager.svelte";

/** Advanced Art Direction settings a user may apply when revising a prompt. */
export interface PromptRegenerationOptions {
  cameraVariant?: string;
  styleReferenceMode?: "named" | "name-free" | "disabled";
  /** Overrides the stature the entity's labels imply. */
  stature?: string;
}

/**
 * What a reviewed prompt carries besides its text. Neither is recoverable from
 * the prompt itself, and sending the text alone dropped both.
 */
export interface ReviewedPromptOptions {
  negativeTerms?: string[];
  aspectRatio?: AspectRatio;
}

export interface RegeneratedPrompt {
  prompt: string;
  negativeTerms: string[];
  /** What the prompt was actually composed at, inferred or explicit. */
  statureId?: string;
  /** Whether that came from the request, a label, or the Oracle's reading. */
  statureSource?: string;
}

export type OracleUiSnapshot = {
  aiDisabled: boolean;
  isDemoMode: boolean;
  entityDiscoveryMode?: string;
  connectionDiscoveryMode?: string;
  autoArchive?: boolean;
  activeThemeId?: string;
};

export type EntityRevisionRequest = {
  source: "revise" | "smart-apply" | "discovery" | "auto-archive";
  entityId?: string;
  title?: string;
  type?: string;
  incoming?: {
    chronicle?: string;
    lore?: string;
  };
  instructions?: string;
  priority?: "instructions-first" | "incoming-first" | "preserve-existing";
};

export type EntityRevisionResult = {
  content: string;
  lore: string;
  categoryId?: string;
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
  readonly revision: any;
  readonly adventure: AdventureManager;

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
  drawEntity(entityId: string): Promise<void>;
  drawMessage(messageId: string): Promise<void>;
  generateEntityFromPrompt(
    entityId: string,
    prompt: string,
    options?: ReviewedPromptOptions,
  ): Promise<void>;
  generateMessageFromPrompt(
    messageId: string,
    prompt: string,
    options?: ReviewedPromptOptions,
  ): Promise<void>;
  regenerateEntityPrompt(
    entityId: string,
    options?: PromptRegenerationOptions,
  ): Promise<RegeneratedPrompt | null>;
  regenerateMessagePrompt(
    messageId: string,
    options?: PromptRegenerationOptions,
  ): Promise<RegeneratedPrompt | null>;
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

  // Revision
  reviseEntity(request: EntityRevisionRequest): Promise<EntityRevisionResult>;
  reviseSmartApply(
    entityId: string,
    incoming: { chronicle?: string; lore?: string },
  ): Promise<{ content?: string; lore?: string; categoryId?: string }>;
  reviseDiscoveryProposal(
    proposal: DiscoveryProposal,
  ): Promise<{ content: string; lore: string }>;
  reviseNewEntityDraft(
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

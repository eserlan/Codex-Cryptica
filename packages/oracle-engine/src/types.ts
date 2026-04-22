/**
 * Oracle Engine Type Definitions
 */

/**
 * Connection mode for the Oracle service.
 * - `system-proxy`: Uses the Cloudflare Worker proxy (no user API key required)
 * - `custom-key`: Uses the user's own Gemini API key directly
 */
export type ConnectionMode = "system-proxy" | "custom-key";

export type EntityDiscoveryMode = "off" | "suggest" | "auto-create";
export type ConnectionDiscoveryMode = "off" | "suggest" | "auto-apply";

export interface OracleAutomationPolicy {
  entityDiscovery: EntityDiscoveryMode;
  connectionDiscovery: ConnectionDiscoveryMode;
}

/**
 * Oracle message role types
 */
export type MessageRole = "user" | "assistant" | "system";

/**
 * Oracle message structure
 */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  type?: "text" | "image" | "wizard" | "roll";
  imageUrl?: string;
  imageBlob?: Blob;
  entityId?: string;
  archiveTargetId?: string;
  wizardType?: "connection" | "merge";
  timestamp?: number;
  rollResult?: any;
  hasDrawAction?: boolean;
  isDrawing?: boolean;
  proposals?: DiscoveryProposal[];
}

/**
 * Oracle intent types for command parsing
 */
export type OracleIntentType =
  | "query"
  | "create"
  | "update"
  | "delete"
  | "connect"
  | "connect-ai"
  | "merge"
  | "merge-ai"
  | "plot"
  | "chat"
  | "roll"
  | "wizard"
  | "help"
  | "clear"
  | "error";

/**
 * Parsed Oracle command intent
 */
export interface OracleIntent {
  type: OracleIntentType;
  query?: string;
  data?: any;
  entityId?: string;
  entityName?: string;
  entityType?: string;
  isDrawing?: boolean;
  isAIIntent?: boolean;
  wizardType?: "connection" | "merge";
  rollExpression?: string;
  formula?: string;
  sourceName?: string;
  targetName?: string;
  label?: string;
  message?: string;
}

/**
 * Undoable action for history management
 */
export interface UndoableAction {
  id: string;
  type?: string;
  timestamp: number;
  description: string;
  messageId?: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

import type { EntityType } from "schema";

/**
 * Transient draft state used during chat
 */
export interface PendingDraft {
  id: string;
  title: string;
  type: EntityType;
  description: string;
  sourceMessageIds: string[];
  state: "new" | "update";
}

/**
 * Proposal for UI rendering (Discovery Chips)
 */
export interface DiscoveryProposal {
  entityId?: string; // Present if 'update'
  title: string;
  type: EntityType;
  draft: {
    lore: string;
    chronicle: string;
  };
  confidence: number;
}

/**
 * Oracle execution context
 * Provides all services needed for Oracle operations
 */
export interface OracleExecutionContext {
  userId?: string;
  vaultId?: string;
  aiDisabled?: boolean;
  tier?: "lite" | "advanced";
  effectiveApiKey?: string | null;
  modelName: string;
  isDemoMode?: boolean;
  vault: any;
  uiStore: any;
  chatHistory: any;
  textGeneration?: any;
  imageGeneration?: any;
  contextRetrieval?: any;
  searchService?: any;
  nodeMergeService?: any;
  diceParser?: any;
  diceEngine?: any;
  diceHistory?: any;
  graph?: any;
  undoRedo?: any;
  draftingEngine?: any;
  categories?: any;
  automationPolicy?: OracleAutomationPolicy;
  proposeConnectionsForEntity?: (
    entityId: string,
    options?: { apply?: boolean; analysisText?: string },
  ) => Promise<number | void>;
  logActivity?: (event: {
    type: "discovery" | "archive" | "update";
    title: string;
    entityType: string;
    entityId?: string;
  }) => void;
}

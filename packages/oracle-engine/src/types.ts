/**
 * Oracle Engine Type Definitions
 */

/**
 * Connection mode for the Oracle service.
 * - `system-proxy`: Uses the Cloudflare Worker proxy (no user API key required)
 * - `custom-key`: Uses the user's own Gemini API key directly
 */
export type ConnectionMode = "system-proxy" | "custom-key";

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
  type: string;
  timestamp: number;
  description: string;
  messageId?: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

/**
 * Oracle execution context
 * Provides all services needed for Oracle operations
 */
export interface OracleExecutionContext {
  userId?: string;
  vaultId?: string;
  liteMode?: boolean;
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
}

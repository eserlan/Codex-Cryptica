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
  type?: "text" | "image" | "wizard";
  imageUrl?: string;
  imageBlob?: Blob;
  entityId?: string;
  archiveTargetId?: string;
  wizardType?: "connection" | "merge";
  timestamp?: number;
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
  | "merge"
  | "roll"
  | "wizard";

/**
 * Parsed Oracle command intent
 */
export interface OracleIntent {
  type: OracleIntentType;
  query?: string;
  data?: any;
  entityId?: string;
  wizardType?: "connection" | "merge";
  rollExpression?: string;
}

/**
 * Undoable action for history management
 */
export interface UndoableAction {
  id: string;
  type: string;
  timestamp: number;
  inverse: () => Promise<void>;
  forward: () => Promise<void>;
}

/**
 * Oracle execution context
 */
export interface OracleExecutionContext {
  userId?: string;
  vaultId?: string;
  liteMode?: boolean;
}

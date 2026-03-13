import type { ContextRetrievalService, TextGenerationService, ImageGenerationService } from "schema";

export type OracleIntent =
  | { type: "chat"; query: string; isAIIntent: boolean }
  | { type: "roll"; formula: string; title?: string }
  | {
      type: "create";
      entityName: string;
      entityType: string;
      isDrawing: boolean;
    }
  | { type: "connect"; sourceName: string; label: string; targetName: string }
  | { type: "merge"; sourceName: string; targetName: string }
  | { type: "connect-ai"; query: string }
  | { type: "merge-ai"; query: string }
  | { type: "plot"; query: string }
  | { type: "help" }
  | { type: "clear" }
  | { type: "error"; message: string };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  type?: "text" | "image" | "wizard" | "roll";
  wizardType?: "connection" | "merge";
  rollResult?: any;
  imageUrl?: string;
  imageBlob?: Blob;
  entityId?: string;
  archiveTargetId?: string;
  sources?: string[];
  isDrawing?: boolean;
  hasDrawAction?: boolean;
  isLongResponse?: boolean;
  responseLength?: "terse" | "balanced" | "detailed";
}

export interface UndoableAction {
  id: string;
  messageId?: string;
  description: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  timestamp: number;
}

export interface OracleExecutionContext {
  vault: any;
  textGeneration: TextGenerationService;
  imageGeneration: ImageGenerationService;
  contextRetrieval: ContextRetrievalService;
  diceEngine: any;
  diceParser: any;
  diceHistory: any;
  searchService: any;
  nodeMergeService: any;
  uiStore: any;
  graph: any;
  chatHistory: any;
  undoRedo: any;
  tier: "lite" | "advanced";
  modelName: string;
  effectiveApiKey: string | null;
  isDemoMode: boolean;
}

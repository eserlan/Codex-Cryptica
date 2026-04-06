# Data Model: Oracle Store Refactor

## Core Types

### `ChatMessage` (Existing)

_The primary unit of data in the Oracle._

```typescript
interface ChatMessage {
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
```

### `UndoableAction` (Existing)

_State required to reverse or re-apply a vault modification._

```typescript
interface UndoableAction {
  id: string;
  messageId?: string;
  description: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  timestamp: number;
}
```

### `OracleIntent` (New)

_A structured representation of a user's request, parsed from raw text._

```typescript
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
  | { type: "plot"; query: string }
  | { type: "help" }
  | { type: "clear" };
```

## Service Data Owners

### `ChatHistoryService`

- **messages**: `$state<ChatMessage[]>`
- **lastUpdated**: `$state<number>`

### `UndoRedoService`

- **undoStack**: `$state<UndoableAction[]>`
- **redoStack**: `$state<UndoableAction[]>`

### `OracleStore` (UI Controller)

- **isOpen**: `$state<boolean>`
- **isLoading**: `$state<boolean>`
- **apiKey**: `$state<string | null>`
- **tier**: `$state<"lite" | "advanced">`

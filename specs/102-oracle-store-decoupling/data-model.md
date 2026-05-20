# Data Model: Oracle Store Managers

The monolithic `OracleStore` is decomposed into the following reactive managers. Each manager is a TypeScript class using Svelte 5 Runes for internal state.

## 1. OracleUiManager

Manages the visibility and transient UI state of the Oracle.

- **State**:
  - `isOpen: boolean` ($state)
  - `isModal: boolean` ($state)
  - `isInitialized: boolean` ($state)
  - `_thinkingCount: number` ($state)
  - `visualizingEntityId: string | null` ($state)
  - `visualizingMessageId: string | null` ($state)
- **Derived**:
  - `isThinking: boolean` ($derived)
- **Methods**:
  - `toggle()`, `toggleModal()`, `open(modal)`, `close()`
  - `updateThinking(delta: number)`
  - `isVisualizingEntity(id)`, `isVisualizingMessage(id)`

## 2. OracleChatManager

Manages the conversation history and interaction with `ChatHistoryService`.

- **State**:
  - `isChatHistoryReady: boolean` (internal)
- **Derived**:
  - `messages: ChatMessage[]` (proxied from service)
- **Methods**:
  - `init(vaultId)`, `switchVault(vaultId)`
  - `sendMessage(content)`, `ask(content)`, `clearMessages()`, `removeMessage(id)`
  - `startWizard(type)`, `reset()`, `updateMessageEntity(msgId, entityId)`

## 3. OracleSettingsManager

Manages API keys, model selection, and tier status.

- **Derived**:
  - `settings`, `apiKey`, `modelName`, `tier`, `isLoading`
- **Methods**:
  - `init()`, `updateSettings(settings)`, `setKey(key)`, `clearKey()`

## 4. OracleActionManager

Orchestrates high-level actions like regeneration and image drawing.

- **Methods**:
  - `regenerate(entityId, onPartial)`
  - `drawEntity(entityId)`, `drawMessage(messageId)`
  - `undo()`, `redo()`, `pushUndoAction(...)`

## 5. OracleContextManager

Assembles the complex `OracleExecutionContext` for the engine.

- **Methods**:
  - `getExecutionContext(): OracleExecutionContext`
  - `createUiStoreSnapshot(): OracleUiSnapshot`

## 6. OracleReconciliationManager

Handles the complex logic of merging AI drafts into the vault.

- **Methods**:
  - `reconcileSmartApply(...)`, `reconcileDiscoveryProposal(...)`, `reconcileNewEntityDraft(...)`
  - `proposeConnectionsForEntity(...)`, `handleDiscoveryConnectionsForEntity(...)`

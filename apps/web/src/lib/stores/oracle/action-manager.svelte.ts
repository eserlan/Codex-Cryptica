import { appEventBus } from "@codex/events";
import { ORACLE_EVENTS } from "@codex/oracle-engine";
import type { IOracleStore } from "./types";

export class OracleActionManager {
  constructor(private store: IOracleStore) {}

  get undoStack() {
    return this.store.undoRedo?.undoStack ?? [];
  }

  get redoStack() {
    return this.store.undoRedo?.redoStack ?? [];
  }

  async undo() {
    await this.store.undoRedo.undo((action: any) => {
      if (action?.messageId) {
        appEventBus.emit({
          type: ORACLE_EVENTS.UNDO_PERFORMED,
          domain: "oracle",
          payload: { messageId: action.messageId },
          metadata: { timestamp: Date.now(), sync: true },
        });
      }
    });
  }

  async redo() {
    await this.store.undoRedo.redo();
  }

  async regenerate(entityId: string, onPartial?: (partial: string) => void) {
    await this.store.executor.execute(
      { type: "regenerate", entityId },
      this.store.getExecutionContext(),
      onPartial,
    );
  }

  async drawEntity(entityId: string) {
    if (this.store.ui.visualizingEntityId === entityId) return;

    this.store.ui.visualizingEntityId = entityId;
    try {
      await this.store.executor.drawEntity(
        entityId,
        this.store.getExecutionContext(),
      );
    } finally {
      if (this.store.ui.visualizingEntityId === entityId) {
        this.store.ui.visualizingEntityId = null;
      }
    }
  }

  async drawMessage(messageId: string) {
    if (this.store.ui.visualizingMessageId === messageId) return;

    this.store.ui.visualizingMessageId = messageId;
    try {
      await this.store.executor.drawMessage(
        messageId,
        this.store.getExecutionContext(),
      );
    } finally {
      if (this.store.ui.visualizingMessageId === messageId) {
        this.store.ui.visualizingMessageId = null;
      }
    }
  }

  pushUndoAction(
    description: string,
    undo: () => Promise<void>,
    messageId?: string,
    redo?: () => Promise<void>,
  ) {
    this.store.undoRedo.pushUndoAction(description, undo, messageId, redo);
  }
}

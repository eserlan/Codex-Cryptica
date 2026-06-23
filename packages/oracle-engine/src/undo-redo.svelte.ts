import type { UndoableAction } from "./types";

export class UndoRedoService {
  undoStack = $state<UndoableAction[]>([]);
  redoStack = $state<UndoableAction[]>([]);
  isUndoing = $state(false);

  pushUndoAction(
    description: string,
    undo: () => Promise<void>,
    messageId?: string,
    redo?: () => Promise<void>,
  ) {
    this.undoStack.push({
      id: crypto.randomUUID(),
      messageId,
      description,
      undo,
      redo:
        redo ||
        (async () => {
          console.warn(`Redo not implemented for: ${description}`);
        }),
      timestamp: Date.now(),
    });

    this.redoStack = [];

    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }
  }

  async undo(onUndo?: (action: UndoableAction) => void) {
    if (this.undoStack.length === 0 || this.isUndoing) return;

    this.isUndoing = true;
    const action = this.undoStack.pop();
    if (action) {
      try {
        await action.undo();
        this.redoStack.push(action);
        if (onUndo) onUndo(action);
      } catch (err: any) {
        console.error("Undo failed:", err);
        this.undoStack.push(action);
        throw err;
      } finally {
        this.isUndoing = false;
      }
    } else {
      this.isUndoing = false;
    }
  }

  async redo() {
    if (this.redoStack.length === 0 || this.isUndoing) return;

    this.isUndoing = true;
    const action = this.redoStack.pop();
    if (action) {
      try {
        await action.redo();
        this.undoStack.push(action);
      } catch (err: any) {
        console.error("Redo failed:", err);
        this.redoStack.push(action);
        throw err;
      } finally {
        this.isUndoing = false;
      }
    } else {
      this.isUndoing = false;
    }
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.isUndoing = false;
  }
}

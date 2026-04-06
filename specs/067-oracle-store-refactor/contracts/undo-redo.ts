export interface IUndoRedoService {
  undoStack: UndoableAction[];
  redoStack: UndoableAction[];
  isUndoing: boolean;

  /**
   * Pushes a new action onto the stack.
   */
  pushUndoAction(
    description: string,
    undo: () => Promise<void>,
    messageId?: string,
    redo?: () => Promise<void>,
  ): void;

  /**
   * Reverses the last action on the stack.
   */
  undo(): Promise<void>;

  /**
   * Re-applies the last action on the redo stack.
   */
  redo(): Promise<void>;

  /**
   * Resets the undo and redo stacks.
   */
  clear(): void;
}

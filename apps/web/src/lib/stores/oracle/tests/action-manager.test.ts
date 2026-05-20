import { describe, it, expect, beforeEach, vi } from "vitest";
import { OracleActionManager } from "../action-manager.svelte";
import type { IOracleStore } from "../types";

describe("OracleActionManager", () => {
  let manager: OracleActionManager;
  let mockStore: any;
  let mockExecutor: any;
  let mockUndoRedo: any;

  beforeEach(() => {
    mockExecutor = {
      execute: vi.fn(),
      drawEntity: vi.fn(),
      drawMessage: vi.fn(),
    };
    mockUndoRedo = {
      undo: vi.fn(),
      redo: vi.fn(),
      pushUndoAction: vi.fn(),
    };
    mockStore = {
      executor: mockExecutor,
      undoRedo: mockUndoRedo,
      getExecutionContext: vi.fn(),
      ui: { visualizingEntityId: null, visualizingMessageId: null },
    };
    manager = new OracleActionManager(mockStore as IOracleStore);
  });

  it("should execute undo", async () => {
    await manager.undo();
    expect(mockUndoRedo.undo).toHaveBeenCalled();
  });

  it("should execute redo", async () => {
    await manager.redo();
    expect(mockUndoRedo.redo).toHaveBeenCalled();
  });

  it("should push undo action", () => {
    const undo = async () => {};
    manager.pushUndoAction("test", undo);
    expect(mockUndoRedo.pushUndoAction).toHaveBeenCalledWith(
      "test",
      undo,
      undefined,
      undefined,
    );
  });
});

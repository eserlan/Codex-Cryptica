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

  it("should draw an entity through the shared execution context", async () => {
    const context = { uiStore: { activeThemeId: "fantasy" } };
    mockStore.getExecutionContext.mockReturnValue(context);

    await manager.drawEntity("entity-1");

    expect(mockStore.ui.visualizingEntityId).toBeNull();
    expect(mockExecutor.drawEntity).toHaveBeenCalledWith("entity-1", context);
  });

  it("should not start a duplicate entity draw while one is active", async () => {
    mockStore.ui.visualizingEntityId = "entity-1";

    await manager.drawEntity("entity-1");

    expect(mockExecutor.drawEntity).not.toHaveBeenCalled();
  });

  it("should draw a message through the shared execution context", async () => {
    const context = { uiStore: { activeThemeId: "cyberpunk" } };
    mockStore.getExecutionContext.mockReturnValue(context);

    await manager.drawMessage("message-1");

    expect(mockStore.ui.visualizingMessageId).toBeNull();
    expect(mockExecutor.drawMessage).toHaveBeenCalledWith("message-1", context);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UndoRedoService } from "./undo-redo.svelte";

const originalBroadcastChannel = globalThis.BroadcastChannel;

describe("UndoRedoService", () => {
  let service: UndoRedoService;

  beforeEach(() => {
    (globalThis as any).BroadcastChannel = vi.fn().mockImplementation(
      class {
        postMessage = vi.fn();
        onmessage = null;
      } as any,
    ) as any;
    service = new UndoRedoService();
  });

  afterEach(() => {
    (globalThis as any).BroadcastChannel = originalBroadcastChannel;
  });

  it("should push undo actions and clear redo stack", async () => {
    service.pushUndoAction("Action 1", async () => {});
    expect(service.undoStack.length).toBe(1);

    // Undo it
    await service.undo();
    expect(service.undoStack.length).toBe(0);
    expect(service.redoStack.length).toBe(1);

    // Push new action
    service.pushUndoAction("Action 2", async () => {});
    expect(service.undoStack.length).toBe(1);
    expect(service.redoStack.length).toBe(0);
  });

  it("should limit stack size to 50", () => {
    for (let i = 0; i < 55; i++) {
      service.pushUndoAction(`Action ${i}`, async () => {});
    }
    expect(service.undoStack.length).toBe(50);
    expect(service.undoStack[0].description).toBe("Action 5");
  });

  it("should execute undo and redo functions", async () => {
    const undoFn = vi.fn().mockResolvedValue(undefined);
    const redoFn = vi.fn().mockResolvedValue(undefined);

    service.pushUndoAction("Test", undoFn, undefined, redoFn);

    await service.undo();
    expect(undoFn).toHaveBeenCalled();
    expect(service.undoStack.length).toBe(0);
    expect(service.redoStack.length).toBe(1);

    await service.redo();
    expect(redoFn).toHaveBeenCalled();
    expect(service.undoStack.length).toBe(1);
    expect(service.redoStack.length).toBe(0);
  });
});

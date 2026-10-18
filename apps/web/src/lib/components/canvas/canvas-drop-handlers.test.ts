import { describe, expect, it, vi } from "vitest";
import { createCanvasDropHandlers } from "./canvas-drop-handlers";

function dropEvent({
  files = [],
  entityId = "",
}: { files?: File[]; entityId?: string } = {}) {
  const dataTransfer = {
    files,
    dropEffect: "",
    getData: vi.fn((type: string) =>
      type === "application/codex-entity" ? entityId : "",
    ),
  };
  return {
    dataTransfer,
    clientX: 120,
    clientY: 240,
    preventDefault: vi.fn(),
  };
}

describe("canvas drop handlers", () => {
  it("sets the appropriate drag effect for editable canvases", () => {
    const handlers = createCanvasDropHandlers({
      isGuest: () => false,
      handleExternalFiles: vi.fn(),
      screenToFlowPosition: (position) => position,
      handleQuickSpawn: vi.fn(),
    });
    const filesEvent = dropEvent({ files: [{} as File] });
    const entityEvent = dropEvent();

    handlers.onDragOver(filesEvent);
    handlers.onDragOver(entityEvent);

    expect(filesEvent.dataTransfer.dropEffect).toBe("copy");
    expect(entityEvent.dataTransfer.dropEffect).toBe("move");
    expect(filesEvent.preventDefault).toHaveBeenCalledOnce();
    expect(entityEvent.preventDefault).toHaveBeenCalledOnce();
  });

  it("blocks guest file drops while allowing non-file drags through", async () => {
    const handleExternalFiles = vi.fn();
    const handlers = createCanvasDropHandlers({
      isGuest: () => true,
      handleExternalFiles,
      screenToFlowPosition: (position) => position,
      handleQuickSpawn: vi.fn(),
    });
    const filesEvent = dropEvent({ files: [{} as File] });
    const entityEvent = dropEvent({ entityId: "entity-1" });

    handlers.onDragOver(filesEvent);
    await handlers.onDrop(filesEvent);
    handlers.onDragOver(entityEvent);
    await handlers.onDrop(entityEvent);

    expect(filesEvent.dataTransfer.dropEffect).toBe("none");
    expect(filesEvent.preventDefault).toHaveBeenCalledTimes(2);
    expect(entityEvent.preventDefault).not.toHaveBeenCalled();
    expect(handleExternalFiles).not.toHaveBeenCalled();
  });

  it("imports dropped files at the pointer location", async () => {
    const handleExternalFiles = vi.fn().mockResolvedValue(undefined);
    const handlers = createCanvasDropHandlers({
      isGuest: () => false,
      handleExternalFiles,
      screenToFlowPosition: (position) => position,
      handleQuickSpawn: vi.fn(),
    });
    const file = {} as File;
    const event = dropEvent({ files: [file] });

    await handlers.onDrop(event);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(handleExternalFiles).toHaveBeenCalledWith([file], {
      x: 120,
      y: 240,
    });
  });

  it("spawns a dropped entity at its converted canvas position", async () => {
    const handleQuickSpawn = vi.fn();
    const screenToFlowPosition = vi.fn(() => ({ x: 12, y: 24 }));
    const handlers = createCanvasDropHandlers({
      isGuest: () => false,
      handleExternalFiles: vi.fn(),
      screenToFlowPosition,
      handleQuickSpawn,
    });
    const event = dropEvent({ entityId: "entity-1" });

    await handlers.onDrop(event);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(screenToFlowPosition).toHaveBeenCalledWith({ x: 120, y: 240 });
    expect(handleQuickSpawn).toHaveBeenCalledWith("entity-1", { x: 12, y: 24 });
  });
});

/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { canvasLogic, importFileToVault } = vi.hoisted(() => ({
  canvasLogic: {
    handleQuickSpawn: vi.fn(),
    labelModal: { isOpen: false, edgeId: "", currentLabel: "" },
    flushSave: vi.fn(),
    saveNow: vi.fn(),
    activeCategories: new Set(),
    nodes: [] as any[],
    edges: [],
    drawings: [] as any[],
    addDrawing: vi.fn(),
    removeDrawing: vi.fn(),
    updateNodeRotation: vi.fn(),
    initializeCanvas: vi.fn(),
    pruneNodes: vi.fn(),
    syncEngine: vi.fn(),
    handleBatchSpawn: vi.fn(),
    onConnect: vi.fn(),
    isConnecting: false,
    contextMenu: null,
    handleDelete: vi.fn(),
    handleCreateEntity: vi.fn(),
    saveLabelModal: vi.fn(),
    screenToFlowPosition: vi.fn((p) => p),
  },
  importFileToVault: vi.fn(),
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: {
    showCanvasSelector: false,
  },
}));

vi.mock("@xyflow/svelte", async () => ({
  SvelteFlow: (await import("./test-fixtures/SvelteFlowInteractionStub.svelte"))
    .default,
  Background: function BackgroundMock() {
    return {};
  },
  Controls: function ControlsMock() {
    return {};
  },
  MiniMap: function MiniMapMock() {
    return {};
  },
  ViewportPortal: (
    await import("./test-fixtures/SnippetPassthroughStub.svelte")
  ).default,
  NodeToolbar: (await import("./test-fixtures/SnippetPassthroughStub.svelte"))
    .default,
  ConnectionMode: {
    Loose: "Loose",
  },
  Position: {
    Top: "top",
  },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    isGuest: false,
    importFileToVault,
  },
}));

vi.mock("$lib/stores/canvas-registry.svelte", () => ({
  canvasRegistry: {
    allCanvases: [],
    pendingEntities: [],
  },
}));

vi.mock("$app/state", () => ({
  page: {
    params: {
      slug: "canvas-1",
    },
  },
}));

vi.mock("$lib/stores/ui/connection-mode.svelte", () => ({
  connectionModeStore: {
    isConnecting: false,
  },
}));

vi.mock("$lib/stores/ui/session-mode.svelte", () => ({
  sessionModeStore: {
    isGuestMode: false,
  },
}));

vi.mock("./use-canvas-logic.svelte", () => ({
  createCanvasLogic: vi.fn(() => canvasLogic),
}));

vi.mock("./use-canvas-events.svelte", () => ({
  useCanvasEvents: vi.fn(),
}));

vi.mock("./ConnectionLine.svelte", () => ({
  default: function ConnectionLineMock() {
    return {};
  },
}));

vi.mock("$lib/components/canvas/EntityNode.svelte", () => ({
  default: function EntityNodeMock() {
    return {};
  },
}));

vi.mock("$lib/components/canvas/CanvasContextMenu.svelte", () => ({
  default: function CanvasContextMenuMock() {
    return {};
  },
}));

vi.mock("$lib/components/canvas/CustomEdge.svelte", () => ({
  default: function CustomEdgeMock() {
    return {};
  },
}));

vi.mock("$lib/components/canvas/EdgeLabelModal.svelte", () => ({
  default: function EdgeLabelModalMock() {
    return {};
  },
}));

vi.mock("$lib/components/hints/CanvasHint.svelte", () => ({
  default: function CanvasHintMock() {
    return {};
  },
}));

vi.mock("$lib/components/canvas/CanvasSelectionModal.svelte", async () => ({
  default: (await import("../modals/__tests__/CanvasSelectionModalStub.svelte"))
    .default,
}));

vi.mock("./CanvasHUD.svelte", async () => ({
  default: (await import("./test-fixtures/CanvasHUDDrawingStub.svelte"))
    .default,
}));

import CanvasWorkspace from "./CanvasWorkspace.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import { vault } from "$lib/stores/vault.svelte";

function setGuestMode(isGuest: boolean) {
  Object.defineProperty(vault, "isGuest", {
    configurable: true,
    value: isGuest,
  });
}

describe("CanvasWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canvasLogic.nodes = [];
    canvasLogic.drawings = [];
    setGuestMode(false);
    modalUIStore.showCanvasSelector = false;
  });

  it("does not mount CanvasSelectionModal locally", () => {
    modalUIStore.showCanvasSelector = true;

    render(CanvasWorkspace, {
      props: {
        engine: {} as any,
      },
    });

    expect(
      screen.getByRole("region", { name: "Canvas Workspace" }),
    ).toBeTruthy();
    expect(screen.queryByTestId("canvas-selection-modal-stub")).toBeNull();
  });

  it("disables viewport gestures while drawing mode is active", async () => {
    render(CanvasWorkspace, {
      props: {
        engine: {} as any,
      },
    });

    const flow = screen.getByTestId("svelte-flow-interaction-stub");
    expect(flow.dataset.panOnDrag).toBe("true");
    expect(flow.dataset.nodesDraggable).toBe("true");
    expect(flow.dataset.nodesConnectable).toBe("true");
    expect(flow.dataset.elementsSelectable).toBe("true");
    expect(flow.dataset.zoomOnScroll).toBe("true");
    expect(flow.dataset.zoomOnPinch).toBe("true");

    await fireEvent.click(
      screen.getByRole("button", { name: "Draw on canvas" }),
    );

    expect(flow.dataset.panOnDrag).toBe("false");
    expect(flow.dataset.nodesDraggable).toBe("false");
    expect(flow.dataset.nodesConnectable).toBe("false");
    expect(flow.dataset.elementsSelectable).toBe("false");
    expect(flow.dataset.zoomOnScroll).toBe("false");
    expect(flow.dataset.zoomOnPinch).toBe("false");

    await fireEvent.click(
      screen.getByRole("button", { name: "Exit drawing mode" }),
    );

    expect(flow.dataset.panOnDrag).toBe("true");
    expect(flow.dataset.nodesDraggable).toBe("true");
    expect(flow.dataset.nodesConnectable).toBe("true");
    expect(flow.dataset.elementsSelectable).toBe("true");
    expect(flow.dataset.zoomOnScroll).toBe("true");
    expect(flow.dataset.zoomOnPinch).toBe("true");
  });

  it("keeps draw and erase modes exclusive and locks viewport gestures while erasing", async () => {
    canvasLogic.drawings = [
      {
        id: "stroke-1",
        color: "#f97316",
        width: 4,
        points: [
          { x: 10, y: 10 },
          { x: 30, y: 30 },
        ],
      },
    ];
    render(CanvasWorkspace, { props: { engine: {} as any } });
    const flow = screen.getByTestId("svelte-flow-interaction-stub");

    await fireEvent.click(
      screen.getByRole("button", { name: "Draw on canvas" }),
    );
    await fireEvent.click(
      screen.getByRole("button", { name: "Erase a drawing stroke" }),
    );

    expect(screen.getByRole("button", { name: "Draw on canvas" })).toBeTruthy();
    expect(flow.dataset.panOnDrag).toBe("false");
    expect(flow.dataset.zoomOnPinch).toBe("false");

    await fireEvent.pointerDown(screen.getByTestId("eraser-target-stroke-1"), {
      pointerId: 7,
      pointerType: "mouse",
      button: 0,
    });
    expect(canvasLogic.removeDrawing).toHaveBeenCalledWith("stroke-1");

    await fireEvent.click(
      screen.getByRole("button", { name: "Exit eraser mode" }),
    );
    expect(flow.dataset.panOnDrag).toBe("true");
  });

  it("imports externally dropped files and adds matching file nodes", async () => {
    importFileToVault.mockResolvedValue({
      ok: true,
      file: {
        path: "files/map-id-map.pdf",
        name: "map.pdf",
        mimeType: "application/pdf",
        size: 42,
      },
    });
    const addFileNode = vi.fn().mockReturnValue("file-node-1");
    render(CanvasWorkspace, { props: { engine: { addFileNode } as any } });
    const file = new File(["map"], "map.pdf", { type: "application/pdf" });

    const dropEvent = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperties(dropEvent, {
      clientX: { value: 100 },
      clientY: { value: 200 },
      dataTransfer: { value: { files: [file], getData: vi.fn() } },
    });
    await fireEvent(
      screen.getByRole("region", { name: "Canvas Workspace" }),
      dropEvent,
    );

    await vi.waitFor(() =>
      expect(importFileToVault).toHaveBeenCalledWith(file),
    );
    expect(addFileNode).toHaveBeenCalledWith(
      expect.objectContaining({ path: "files/map-id-map.pdf" }),
      { x: 100, y: 200 },
    );
    expect(canvasLogic.nodes).toMatchObject([
      { id: "file-node-1", type: "file", data: { file: { name: "map.pdf" } } },
    ]);
    expect(canvasLogic.saveNow).toHaveBeenCalledOnce();
  });

  it("does not create a canvas node when an external file is rejected", async () => {
    importFileToVault.mockResolvedValue({ ok: false, reason: "too_large" });
    const addFileNode = vi.fn();
    render(CanvasWorkspace, { props: { engine: { addFileNode } as any } });
    const file = new File(["map"], "map.pdf", { type: "application/pdf" });

    await fireEvent.drop(
      screen.getByRole("region", { name: "Canvas Workspace" }),
      { dataTransfer: { files: [file], getData: vi.fn() } },
    );

    await vi.waitFor(() =>
      expect(importFileToVault).toHaveBeenCalledWith(file),
    );
    expect(addFileNode).not.toHaveBeenCalled();
    expect(canvasLogic.nodes).toEqual([]);
    expect(canvasLogic.saveNow).not.toHaveBeenCalled();
  });

  it("does not start a second import while a file upload is in progress", async () => {
    let finishImport: (value: unknown) => void;
    importFileToVault.mockReturnValue(
      new Promise((resolve) => {
        finishImport = resolve;
      }),
    );
    const addFileNode = vi.fn().mockReturnValue("file-node-1");
    render(CanvasWorkspace, { props: { engine: { addFileNode } as any } });
    const canvas = screen.getByRole("region", { name: "Canvas Workspace" });
    const file = new File(["map"], "map.pdf", { type: "application/pdf" });
    const dropData = { dataTransfer: { files: [file], getData: vi.fn() } };

    await fireEvent.drop(canvas, dropData);
    await fireEvent.drop(canvas, dropData);

    await vi.waitFor(() => expect(importFileToVault).toHaveBeenCalledTimes(1));
    finishImport!({
      ok: true,
      file: {
        path: "files/map-id-map.pdf",
        name: "map.pdf",
        mimeType: "application/pdf",
        size: 42,
      },
    });
    await vi.waitFor(() => expect(addFileNode).toHaveBeenCalledOnce());
    expect(canvasLogic.saveNow).toHaveBeenCalledOnce();
  });

  it("allows another upload after an import throws", async () => {
    importFileToVault
      .mockRejectedValueOnce(new Error("OPFS unavailable"))
      .mockResolvedValueOnce({
        ok: true,
        file: {
          path: "files/map-id-map.pdf",
          name: "map.pdf",
          mimeType: "application/pdf",
          size: 42,
        },
      });
    const addFileNode = vi.fn().mockReturnValue("file-node-1");
    render(CanvasWorkspace, { props: { engine: { addFileNode } as any } });
    const canvas = screen.getByRole("region", { name: "Canvas Workspace" });
    const file = new File(["map"], "map.pdf", { type: "application/pdf" });
    const dropData = { dataTransfer: { files: [file], getData: vi.fn() } };

    await fireEvent.drop(canvas, dropData);
    await vi.waitFor(() => expect(importFileToVault).toHaveBeenCalledTimes(1));
    await fireEvent.drop(canvas, dropData);

    await vi.waitFor(() => expect(addFileNode).toHaveBeenCalledOnce());
    expect(importFileToVault).toHaveBeenCalledTimes(2);
  });

  it("blocks guest file drops without importing or navigating away", async () => {
    setGuestMode(true);
    const addFileNode = vi.fn();
    render(CanvasWorkspace, { props: { engine: { addFileNode } as any } });
    const file = new File(["map"], "map.pdf", { type: "application/pdf" });
    const dropEvent = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperties(dropEvent, {
      dataTransfer: { value: { files: [file], getData: vi.fn() } },
    });

    await fireEvent(
      screen.getByRole("region", { name: "Canvas Workspace" }),
      dropEvent,
    );

    expect(dropEvent.defaultPrevented).toBe(true);
    expect(importFileToVault).not.toHaveBeenCalled();
    expect(addFileNode).not.toHaveBeenCalled();
  });

  it("imports a pasted clipboard image and adds a matching file node", async () => {
    importFileToVault.mockResolvedValue({
      ok: true,
      file: {
        path: "files/pasted-id-pasted-image.png",
        name: "pasted-image.png",
        mimeType: "image/png",
        size: 42,
      },
    });
    const addFileNode = vi.fn().mockReturnValue("file-node-1");
    render(CanvasWorkspace, { props: { engine: { addFileNode } as any } });
    const file = new File(["img"], "pasted-image.png", { type: "image/png" });

    const pasteEvent = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(pasteEvent, "clipboardData", {
      value: { files: [file], items: [] },
    });
    await fireEvent(window, pasteEvent);

    await vi.waitFor(() =>
      expect(importFileToVault).toHaveBeenCalledWith(file),
    );
    expect(addFileNode).toHaveBeenCalledOnce();
    expect(canvasLogic.nodes).toMatchObject([
      { id: "file-node-1", type: "file" },
    ]);
  });

  it("ignores paste events without an image on the clipboard", async () => {
    render(CanvasWorkspace, { props: { engine: {} as any } });

    const pasteEvent = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(pasteEvent, "clipboardData", {
      value: { files: [], items: [] },
    });
    await fireEvent(window, pasteEvent);

    expect(importFileToVault).not.toHaveBeenCalled();
  });

  it("undoes the last drawing stroke on Ctrl+Z", async () => {
    canvasLogic.drawings = [
      { id: "stroke-1", color: "#f97316", width: 4, points: [{ x: 0, y: 0 }] },
      { id: "stroke-2", color: "#f97316", width: 4, points: [{ x: 1, y: 1 }] },
    ];
    render(CanvasWorkspace, { props: { engine: {} as any } });

    await fireEvent.keyDown(window, { key: "z", ctrlKey: true });

    expect(canvasLogic.removeDrawing).toHaveBeenCalledWith("stroke-2");
  });

  it("does not undo a drawing stroke when nothing has been drawn", async () => {
    render(CanvasWorkspace, { props: { engine: {} as any } });

    await fireEvent.keyDown(window, { key: "z", ctrlKey: true });

    expect(canvasLogic.removeDrawing).not.toHaveBeenCalled();
  });
});

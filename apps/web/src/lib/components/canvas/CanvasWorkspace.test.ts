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

vi.mock("@xyflow/svelte", () => ({
  SvelteFlow: function SvelteFlowMock() {
    return {};
  },
  Background: function BackgroundMock() {
    return {};
  },
  Controls: function ControlsMock() {
    return {};
  },
  MiniMap: function MiniMapMock() {
    return {};
  },
  ConnectionMode: {
    Loose: "Loose",
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

vi.mock("./CanvasHUD.svelte", () => ({
  default: function CanvasHUDMock() {
    return {};
  },
}));

import CanvasWorkspace from "./CanvasWorkspace.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

describe("CanvasWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canvasLogic.nodes = [];
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
});

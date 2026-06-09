/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  createCanvasLogic: vi.fn(() => ({
    handleQuickSpawn: vi.fn(),
    labelModal: {
      isOpen: false,
      edgeId: "",
      currentLabel: "",
    },
    flushSave: vi.fn(),
    activeCategories: new Set(),
    nodes: [],
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
  })),
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

vi.mock("./CanvasHUD.svelte", () => ({
  default: function CanvasHUDMock() {
    return {};
  },
}));

import CanvasWorkspace from "./CanvasWorkspace.svelte";

describe("CanvasWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not mount CanvasSelectionModal locally", () => {
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
});

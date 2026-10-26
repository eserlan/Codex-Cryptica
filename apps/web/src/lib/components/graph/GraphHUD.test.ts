/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { fireEvent } from "@testing-library/dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GraphHUD from "./GraphHUD.svelte";

const mockGraph = vi.hoisted(() => ({
  activeCategories: new Set<string>(),
  activeLabels: new Set<string>(),
  timelineMode: false,
  timelineAxis: "x" as const,
  labelFilterMode: "OR" as const,
  isLargeGraph: false,
  focusViewActive: false,
  focusDepth: 2,
  canIncreaseFocusDetail: true,
  stats: { nodeCount: 3, edgeCount: 2 },
  fullGraphSize: { nodeCount: 3, edgeCount: 2 },
  toggleCategoryFilter: vi.fn(),
  clearCategoryFilters: vi.fn(),
  toggleLabelFilter: vi.fn(),
  toggleLabelFilterMode: vi.fn(),
  clearLabelFilters: vi.fn(),
  toggleFullGraph: vi.fn(),
  increaseFocusDetail: vi.fn(),
}));

vi.mock("svelte/transition", () => ({
  fade: () => ({ duration: 0 }),
}));

vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: {
    jargon: {
      vault: "Vault",
    },
  },
}));

vi.mock("$lib/stores/graph.svelte", () => ({
  FOCUS_DETAIL_STEP: 150,
  FOCUS_EDGE_CAP: 2_000,
  graph: mockGraph,
}));

vi.mock("$lib/stores/canvas-registry.svelte", () => ({
  canvasRegistry: {
    queueEntities: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: {
    notify: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/session-mode.svelte", () => ({
  sessionModeStore: {
    sharedMode: false,
  },
}));

vi.mock("$lib/stores/ui/connection-mode.svelte", () => ({
  connectionModeStore: {
    isConnecting: false,
    connectingNodeId: null,
    toggleConnectMode: vi.fn(),
  },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    labelIndex: [],
    labelCounts: {},
  },
}));

vi.mock("$lib/stores/categories.svelte", () => ({
  categories: {
    list: [],
  },
}));

vi.mock("$lib/utils/icon", () => ({
  getIconClass: () => "icon-[lucide--circle]",
}));

describe("GraphHUD", () => {
  beforeEach(() => {
    mockGraph.activeCategories = new Set();
    mockGraph.activeLabels = new Set();
    mockGraph.timelineMode = false;
    mockGraph.isLargeGraph = false;
    mockGraph.focusViewActive = false;
    mockGraph.canIncreaseFocusDetail = true;
    mockGraph.stats = { nodeCount: 3, edgeCount: 2 };
    mockGraph.fullGraphSize = { nodeCount: 3, edgeCount: 2 };
    mockGraph.toggleFullGraph.mockClear();
    mockGraph.increaseFocusDetail.mockClear();
  });

  it("shows the focus-view notice with a 'Show full graph' action by default", () => {
    mockGraph.isLargeGraph = true;
    mockGraph.focusViewActive = true;
    mockGraph.stats = { nodeCount: 38, edgeCount: 120 };
    mockGraph.fullGraphSize = { nodeCount: 1600, edgeCount: 9000 };

    render(GraphHUD, {
      selectedEntity: null,
      parentEntity: null,
      selectedId: null,
      isLayoutRunning: false,
      cy: undefined,
    });

    expect(
      screen.getByText(
        "Focus view: showing 38 of 1600 entities (detail level 2).",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Show full graph" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Show more detail" }),
    ).toBeTruthy();
  });

  it("reveals more focus detail only through the explicit control", async () => {
    mockGraph.isLargeGraph = true;
    mockGraph.focusViewActive = true;

    render(GraphHUD, {
      selectedEntity: null,
      parentEntity: null,
      selectedId: null,
      isLayoutRunning: false,
      cy: undefined,
    });

    await fireEvent.click(
      screen.getByRole("button", { name: "Show more detail" }),
    );

    expect(mockGraph.increaseFocusDetail).toHaveBeenCalledOnce();
  });

  it("shows the full-graph performance notice when focus view is off", () => {
    mockGraph.isLargeGraph = true;
    mockGraph.focusViewActive = false;
    mockGraph.stats = { nodeCount: 1600, edgeCount: 9000 };
    mockGraph.fullGraphSize = { nodeCount: 1600, edgeCount: 9000 };

    render(GraphHUD, {
      selectedEntity: null,
      parentEntity: null,
      selectedId: null,
      isLayoutRunning: false,
      cy: undefined,
    });

    expect(
      screen.getByText(
        "Full graph performance mode: 1600 entities and 9000 connections.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Back to focus view" }),
    ).toBeTruthy();
  });

  it("does not show the large-vault notice for small graphs", () => {
    render(GraphHUD, {
      selectedEntity: null,
      parentEntity: null,
      selectedId: null,
      isLayoutRunning: false,
      cy: undefined,
    });

    expect(screen.queryByText(/performance mode|Focus view/i)).toBeNull();
  });
});

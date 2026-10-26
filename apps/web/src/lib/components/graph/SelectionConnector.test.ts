/** @vitest-environment jsdom */

import { render, fireEvent, waitFor } from "@testing-library/svelte";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock transitions
vi.mock("svelte/transition", () => ({
  fade: () => ({ duration: 0 }),
}));

// Mock Element.prototype.animate for jsdom
if (typeof Element !== "undefined" && !Element.prototype.animate) {
  Element.prototype.animate = vi.fn().mockReturnValue({
    finished: Promise.resolve(),
    cancel: vi.fn(),
  });
}

import SelectionConnector from "./SelectionConnector.svelte";
import { connectionModeStore } from "$lib/stores/ui/connection-mode.svelte";

// Mock Svelte client runtime

// Mock stores
vi.mock("$lib/stores/ui/connection-mode.svelte", () => ({
  connectionModeStore: {
    showSelectionConnector: false,
    lastConnectionLabel: "",
    recentConnectionLabels: [],
    setLastConnectionLabel: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: {
    notify: vi.fn(),
  },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    addConnection: vi.fn(),
    entities: {},
    inboundConnections: {},
  },
}));

describe("SelectionConnector Dismissal", () => {
  const mockCy = {
    on: vi.fn(),
    off: vi.fn(),
    $: vi.fn().mockReturnValue({
      length: 2,
      map: vi.fn().mockReturnValue(["id1", "id2"]),
      0: {
        renderedPosition: () => ({ x: 100, y: 100 }),
        id: () => "id1",
        data: (key: string) => (key === "label" ? "Node 1" : undefined),
      },
      1: {
        renderedPosition: () => ({ x: 200, y: 200 }),
        id: () => "id2",
        data: (key: string) => (key === "label" ? "Node 2" : undefined),
      },
    }),
    elements: vi.fn().mockReturnValue({
      unselect: vi.fn(),
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    connectionModeStore.showSelectionConnector = false;
  });

  it("should close when Escape key is pressed", async () => {
    connectionModeStore.showSelectionConnector = true;
    render(SelectionConnector, { cy: mockCy as any });

    // Mock that we have 2 nodes selected
    // The component uses $effect to update selection, so we need to wait
    await waitFor(() =>
      expect(connectionModeStore.showSelectionConnector).toBe(true),
    );

    await fireEvent.keyDown(window, { key: "Escape" });
    expect(connectionModeStore.showSelectionConnector).toBe(false);
  });

  it("should close when clicking the backdrop", async () => {
    connectionModeStore.showSelectionConnector = true;
    const { container } = render(SelectionConnector, { cy: mockCy as any });

    // Find the backdrop - it's the first div inside the #if
    // We can use a data-testid or just find it by class
    // I didn't add data-testid, so I'll find by class "fixed inset-0"
    const backdrop = container.querySelector(".fixed.inset-0");
    expect(backdrop).toBeTruthy();

    await fireEvent.click(backdrop!);
    expect(connectionModeStore.showSelectionConnector).toBe(false);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import cytoscape from "cytoscape";
import type { Core, NodeSingular } from "cytoscape";
import { setupGraphEvents } from "graph-engine";
import { GraphViewInteractions } from "./graph-view-interactions";
import type { GraphViewDependencies, GraphViewHost } from "./graph-view-types";
import {
  SEARCH_ENTITY_FOCUS_EVENT,
  DEFAULT_SEARCH_ENTITY_ZOOM,
} from "../search/search-focus";

vi.mock("graph-engine", () => ({ setupGraphEvents: vi.fn(() => vi.fn()) }));

describe("GraphViewInteractions", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function setup() {
    const cy = {
      scratch: () => 0,
      $: () => ({ unselect: vi.fn() }),
      nodes: () => ({ length: 0 }),
      edges: () => ({ length: 0 }),
      container: () => null,
    } as unknown as Core;
    const host = {
      cy,
      selectedId: null,
      clearGraphSelection: vi.fn(),
      applyFocus: vi.fn(),
      pendingSearchFocus: null,
    } as unknown as GraphViewHost;
    const deps = {
      clock: { now: () => 1000 },
      connectionModeStore: {
        isConnecting: false,
        connectingNodeId: null,
        toggleConnectMode: vi.fn(),
      },
      layoutUIStore: { isMobile: false, setLastSelectedNodePosition: vi.fn() },
      modalUIStore: { openZenMode: vi.fn() },
      vault: { addConnection: vi.fn().mockResolvedValue(undefined) },
    };
    const interactions = new GraphViewInteractions(
      host,
      deps as unknown as GraphViewDependencies,
    );
    interactions.attach(cy);
    const handlers = vi.mocked(setupGraphEvents).mock.calls.at(-1)![1];
    const node = {
      cy: () => cy,
      addClass: vi.fn(),
      removeClass: vi.fn(),
    } as unknown as NodeSingular;
    const tap = (id: string) =>
      handlers.onNodeTap!(id, node) as unknown as Promise<void>;
    return { cy, host, deps, interactions, handlers, node, tap };
  }

  it("delays desktop selection and cancels it when selection is cleared", async () => {
    vi.useFakeTimers();
    const { host, interactions, tap } = setup();
    await tap("first");
    vi.advanceTimersByTime(300);
    expect(host.selectedId).toBe("first");
    await tap("second");
    interactions.clearGraphSelection();
    vi.advanceTimersByTime(300);
    expect(host.selectedId).toBeNull();
    expect(host.applyFocus).toHaveBeenCalledWith(null);
  });

  it("opens mobile selections in Zen and ignores taps just after a context tap", async () => {
    const { deps, cy, tap } = setup();
    deps.layoutUIStore.isMobile = true;
    await tap("first");
    expect(deps.modalUIStore.openZenMode).toHaveBeenCalledWith("first");
    cy.scratch = vi.fn().mockReturnValue(900);
    await tap("second");
    expect(deps.modalUIStore.openZenMode).toHaveBeenCalledOnce();
  });

  it("selects and deselects a connection source before saving a new connection", async () => {
    const { deps, node, tap } = setup();
    deps.connectionModeStore.isConnecting = true;
    await tap("source");
    expect(node.addClass).toHaveBeenCalledWith("selected-source");
    await tap("source");
    expect(node.removeClass).toHaveBeenCalledWith("selected-source");
    await tap("source");
    await tap("target");
    expect(deps.vault.addConnection).toHaveBeenCalledWith(
      "source",
      "target",
      "neutral",
    );
    expect(deps.connectionModeStore.toggleConnectMode).toHaveBeenCalledOnce();
  });

  it("keeps connection mode active if saving fails", async () => {
    const { deps, tap } = setup();
    deps.connectionModeStore.isConnecting = true;
    await tap("source");
    deps.vault.addConnection.mockRejectedValueOnce(new Error("save failed"));
    await expect(tap("target")).rejects.toThrow("save failed");
    expect(deps.connectionModeStore.toggleConnectMode).not.toHaveBeenCalled();
    expect(deps.connectionModeStore.connectingNodeId).toBe("source");
  });

  it("receives valid search focus requests and removes its listener on destroy", () => {
    const { host, interactions } = setup();
    interactions.listenForSearchFocus();
    window.dispatchEvent(
      new CustomEvent(SEARCH_ENTITY_FOCUS_EVENT, { detail: {} }),
    );
    expect(host.pendingSearchFocus).toBeNull();
    window.dispatchEvent(
      new CustomEvent(SEARCH_ENTITY_FOCUS_EVENT, {
        detail: { entityId: "first" },
      }),
    );
    expect(host.pendingSearchFocus).toMatchObject({
      entityId: "first",
      zoom: DEFAULT_SEARCH_ENTITY_ZOOM,
    });
    interactions.destroy();
    window.dispatchEvent(
      new CustomEvent(SEARCH_ENTITY_FOCUS_EVENT, {
        detail: { entityId: "second" },
      }),
    );
    expect(host.pendingSearchFocus?.entityId).toBe("first");
  });

  it("highlights two neighbourhood levels and clears dimming for missing nodes", () => {
    const { interactions, host } = setup();
    const cy = cytoscape({
      headless: true,
      elements: [
        ...["first", "second", "third", "unrelated"].map((id) => ({
          data: { id },
        })),
        { data: { id: "one", source: "first", target: "second" } },
        { data: { id: "two", source: "second", target: "third" } },
      ],
    });
    host.cy = cy;
    try {
      interactions.applyFocus("first");
      expect(cy.$id("first").hasClass("neighborhood")).toBe(true);
      expect(cy.$id("second").hasClass("neighborhood")).toBe(true);
      expect(cy.$id("third").hasClass("secondary-neighborhood")).toBe(true);
      expect(cy.$id("unrelated").hasClass("dimmed")).toBe(true);
      interactions.applyFocus("missing");
      expect(
        cy.$(".dimmed, .neighborhood, .secondary-neighborhood").length,
      ).toBe(0);
    } finally {
      cy.destroy();
    }
  });

  it("keeps hover coordinates current and opens edge editing with defaults", () => {
    const { cy, host, handlers } = setup();
    const renderedPosition = { x: 50, y: 70 };
    cy.$id = vi
      .fn()
      .mockReturnValue({ length: 1, renderedPosition: () => renderedPosition });
    handlers.onNodeMouseOver!("first", { x: 10, y: 20 });
    expect(host.hoveredEntityId).toBe("first");
    expect(handlers.onViewportChange!(null)).toEqual(renderedPosition);
    handlers.onNodeMouseOut!();
    expect(host.hoveredEntityId).toBeNull();
    expect(host.hoverPosition).toBeNull();
    handlers.onEdgeTap!({ source: "first", target: "second" });
    expect(host.editingEdge).toEqual({
      source: "first",
      target: "second",
      label: "",
      type: "neutral",
    });
  });
});

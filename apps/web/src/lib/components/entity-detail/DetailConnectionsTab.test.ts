/** @vitest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import type { Entity } from "schema";

const { entities, vaultMock, cyInstances, imageManagerInstances } = vi.hoisted(
  () => {
    const king = {
      id: "king",
      type: "character",
      title: "King Béla",
      connections: [
        { target: "duke", type: "friendly", label: "ally", strength: 1 },
        { target: "guard", type: "owns", label: "commands", strength: 1 },
      ],
    } as unknown as Entity;
    const duke = {
      id: "duke",
      type: "character",
      title: "Duke Miklós",
      connections: [],
    } as unknown as Entity;
    const guard = {
      id: "guard",
      type: "faction",
      title: "Royal Guard",
      connections: [],
    } as unknown as Entity;
    const kingdom = {
      id: "kingdom",
      type: "location",
      title: "Kingdom of Pagen",
      connections: [
        { target: "king", type: "owns", label: "rules", strength: 1 },
      ],
    } as unknown as Entity;
    // Second-degree: connected to the duke, never to the king.
    const rival = {
      id: "rival",
      type: "character",
      title: "Rival Baron",
      connections: [{ target: "duke", type: "enemy", strength: 1 }],
    } as unknown as Entity;
    const wraith = {
      id: "wraith",
      type: "creature",
      title: "Old Wraith",
      labels: ["past"],
      connections: [
        { target: "king", type: "enemy", label: "haunts", strength: 1 },
      ],
    } as unknown as Entity;
    const hermit = {
      id: "hermit",
      type: "character",
      title: "The Hermit",
      connections: [],
    } as unknown as Entity;

    const entities = { king, duke, guard, kingdom, rival, hermit, wraith };
    const vaultMock = {
      entities,
      allEntities: Object.values(entities),
      inboundConnections: {
        king: [
          { sourceId: "kingdom", connection: kingdom.connections[0] },
          { sourceId: "wraith", connection: wraith.connections[0] },
        ],
        duke: [
          { sourceId: "king", connection: king.connections[0] },
          { sourceId: "rival", connection: rival.connections[0] },
        ],
        guard: [{ sourceId: "king", connection: king.connections[1] }],
      },
      isGuest: false,
      defaultVisibility: "visible",
      selectedEntityId: null as string | null,
      resolveImageUrl: vi.fn().mockResolvedValue(""),
      releaseImageUrl: vi.fn(),
    };

    const cyInstances: any[] = [];
    const imageManagerInstances: any[] = [];
    return { entities, vaultMock, cyInstances, imageManagerInstances };
  },
);

// A real cytoscape instance needs a canvas 2D context jsdom doesn't provide,
// so this mocks the same `graph-engine` seam `graph-view-controller.test.ts`
// mocks — a minimal fake `cy` recording enough calls to assert the component
// wires elements, style, layout, images and taps correctly, without needing
// jsdom to actually paint anything.
vi.mock("graph-engine", () => {
  function makeCy() {
    const listeners: Record<string, ((evt: any) => void)[]> = {};
    const nodeData = new Map<string, Record<string, unknown>>();
    const cy = {
      style: vi.fn(),
      batch: vi.fn((cb: () => void) => cb()),
      elements: vi.fn(() => ({ remove: vi.fn() })),
      nodes: vi.fn(() =>
        Array.from(nodeData.entries()).map(([id, data]) => ({
          id: () => id,
          data: (key?: string) => (key ? data[key] : data),
        })),
      ),
      add: vi.fn((els: any[]) => {
        for (const el of els) {
          if (el.group === "nodes") nodeData.set(el.data.id, { ...el.data });
        }
      }),
      layout: vi.fn(() => ({ run: vi.fn() })),
      resize: vi.fn(),
      fit: vi.fn(),
      viewport: vi.fn(),
      destroy: vi.fn(),
      destroyed: vi.fn(() => false),
      on: vi.fn(
        (event: string, _selector: string, handler: (evt: any) => void) => {
          (listeners[event] ??= []).push(handler);
        },
      ),
      // Test-only escape hatch: fire a previously-registered handler.
      __emit: (event: string, evt: any) => {
        for (const handler of listeners[event] ?? []) handler(evt);
      },
    };
    cyInstances.push(cy);
    return cy;
  }

  return {
    initGraph: vi.fn(async () => makeCy()),
    GraphImageManager: vi.fn().mockImplementation(function () {
      const manager = { sync: vi.fn() };
      imageManagerInstances.push(manager);
      return manager;
    }),
  };
});

vi.mock("$lib/stores/vault.svelte", () => ({ vault: vaultMock }));
vi.mock("$lib/stores/categories.svelte", () => ({
  categories: {
    getCategory: (type: string) => ({
      color: "#abcdef",
      icon: `lucide:${type}`,
    }),
  },
}));
vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: {
    activeTheme: { tokens: { text: "#111", border: "#ccc", primary: "#f00" } },
  },
}));
vi.mock("$lib/stores/ui/layout-ui.svelte", () => ({
  layoutUIStore: { setLastSelectedNodePosition: vi.fn() },
}));

import DetailConnectionsTab from "./DetailConnectionsTab.svelte";

const lastCy = () => cyInstances[cyInstances.length - 1];

const tapNode = (cy: any, id: string, isCentre = false) =>
  cy.__emit("tap", {
    target: {
      id: () => id,
      data: (k: string) => (k === "isCentre" ? isCentre : undefined),
    },
    originalEvent: new MouseEvent("click"),
  });

describe("DetailConnectionsTab", () => {
  beforeAll(() => {
    if (!(globalThis as any).ResizeObserver) {
      (globalThis as any).ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
    }
  });

  beforeEach(() => {
    vaultMock.selectedEntityId = null;
    vaultMock.isGuest = false;
    cyInstances.length = 0;
    imageManagerInstances.length = 0;
  });

  it("names the diagram for assistive tech and points at the Status tab's operable equivalent", async () => {
    render(DetailConnectionsTab, { entity: entities.king });
    await Promise.resolve();

    const note = screen
      .getByTestId("connections-a11y-note")
      .textContent!.replace(/\s+/g, " ");
    expect(note).toContain("4 direct connections");
    expect(note).toContain("Status tab");
  });

  it("shows an empty state for an unconnected entity", async () => {
    render(DetailConnectionsTab, { entity: entities.hermit });
    await Promise.resolve();

    expect(screen.getByTestId("connections-empty")).toBeTruthy();
  });

  describe("cytoscape wiring", () => {
    it("initializes the canvas without its own pan/zoom gestures", async () => {
      const { initGraph } = await import("graph-engine");
      render(DetailConnectionsTab, { entity: entities.king });
      await Promise.resolve();
      await Promise.resolve();

      expect(initGraph).toHaveBeenCalledWith(
        expect.objectContaining({
          userPanningEnabled: false,
          userZoomingEnabled: false,
        }),
      );
    });

    it("loads only direct connections, in both directions, and runs a concentric layout", async () => {
      render(DetailConnectionsTab, { entity: entities.king });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      const cy = lastCy();
      expect(cy.add).toHaveBeenCalled();
      const added = cy.add.mock.calls[0][0];
      const ids = added.map((el: any) => el.data.id ?? el.data.target);
      expect(added.some((el: any) => el.data.isCentre)).toBe(true);
      expect(ids).toEqual(
        expect.arrayContaining(["duke", "guard", "kingdom", "wraith"]),
      );
      // Second-degree (connected to the duke, never to the king) never appears.
      expect(ids).not.toContain("rival");
      expect(cy.layout).toHaveBeenCalledWith(
        expect.objectContaining({ name: "concentric" }),
      );
    });

    it("syncs portraits through GraphImageManager using the vault's resolver", async () => {
      render(DetailConnectionsTab, { entity: entities.king });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      const manager = imageManagerInstances[imageManagerInstances.length - 1];
      expect(manager.sync).toHaveBeenCalledWith(
        expect.objectContaining({
          showImages: true,
          resolveImageUrl: expect.any(Function),
        }),
      );
    });

    it("remembers a resolved portrait so a later mount can paint it immediately", async () => {
      const { resolvedImageUrlCache } = await import("./connections-cytoscape");
      resolvedImageUrlCache.clear();
      const kingWithImage = { ...entities.king, image: "king.png" } as Entity;
      vaultMock.resolveImageUrl.mockResolvedValueOnce("blob:king-portrait");

      // First mount: nothing cached yet, so the portrait comes from the
      // normal async resolve/sync path.
      const first = render(DetailConnectionsTab, { entity: kingWithImage });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      const manager = imageManagerInstances[imageManagerInstances.length - 1];
      const resolveImageUrl =
        manager.sync.mock.calls.at(-1)?.[0].resolveImageUrl;
      await resolveImageUrl("king.png");
      expect(resolvedImageUrlCache.get("king.png")).toBe("blob:king-portrait");
      first.unmount();

      // This is the reported bug: EntityDetailPanel remounts this whole
      // component (`{#key activeEntity.id}`) on every entity selection, so
      // the *only* thing that can survive to the next mount is the cache —
      // nothing scoped to the destroyed cytoscape instance does.
      cyInstances.length = 0;
      render(DetailConnectionsTab, { entity: kingWithImage });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      const cy = lastCy();
      const added = cy.add.mock.calls[0][0];
      const king = added.find((el: any) => el.data.isCentre);
      expect(king.data.resolvedImage).toBe("blob:king-portrait");
    });

    it("creates a fresh GraphImageManager on every rebuild instead of reusing one across an entity switch", async () => {
      // Unlike the side panel (EntityDetailPanel wraps its tab body in
      // `{#key activeEntity.id}`, destroying this component outright), zen
      // mode keeps the same component instance alive across navigation —
      // only the `entity` prop changes. The bug this guards: an old
      // GraphImageManager's `resolvingIds` bookkeeping survives
      // `cy.elements().remove()` even though the node objects it refers to
      // don't, so a resolve still in-flight for one entity's nodes could
      // make the manager think an id from the *next* entity's node set (a
      // coincidentally-revisited id) was "already resolving" and skip it —
      // silently never painting that portrait.
      const { rerender } = render(DetailConnectionsTab, {
        entity: entities.king,
      });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      const firstManager = imageManagerInstances.at(-1);

      await rerender({ entity: entities.kingdom });
      await Promise.resolve();

      const secondManager = imageManagerInstances.at(-1);
      expect(secondManager).not.toBe(firstManager);
      expect(imageManagerInstances.length).toBeGreaterThan(1);
      // The cytoscape instance itself, though, is the SAME one — no remount.
      expect(cyInstances).toHaveLength(1);
    });

    it("opens a neighbour when cytoscape reports a tap on its node, ignoring the centre", async () => {
      const onNavigate = vi.fn();
      render(DetailConnectionsTab, { entity: entities.king, onNavigate });
      await Promise.resolve();
      await Promise.resolve();

      const cy = lastCy();
      tapNode(cy, "king", true);
      tapNode(cy, "duke");

      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onNavigate).toHaveBeenCalledWith("duke", expect.anything());
    });

    it("selects a connected entity by default when no onNavigate is given", async () => {
      render(DetailConnectionsTab, { entity: entities.king });
      await Promise.resolve();
      await Promise.resolve();

      tapNode(lastCy(), "guard");

      expect(vaultMock.selectedEntityId).toBe("guard");
    });

    it("destroys the cytoscape instance on unmount", async () => {
      const { unmount } = render(DetailConnectionsTab, {
        entity: entities.king,
      });
      await Promise.resolve();
      await Promise.resolve();

      const cy = lastCy();
      unmount();

      expect(cy.destroy).toHaveBeenCalled();
    });
  });

  describe("pan, zoom and touch policy", () => {
    it("zooms with the controls and reflects the level in the readout", async () => {
      render(DetailConnectionsTab, { entity: entities.king });
      await Promise.resolve();

      expect(
        screen.getByTestId("connections-zoom-reset").textContent,
      ).toContain("100%");

      await fireEvent.click(screen.getByTestId("connections-zoom-in"));
      await Promise.resolve();
      expect(
        screen.getByTestId("connections-zoom-reset").textContent,
      ).toContain("125%");

      await fireEvent.click(screen.getByTestId("connections-zoom-reset"));
      await Promise.resolve();
      expect(
        screen.getByTestId("connections-zoom-reset").textContent,
      ).toContain("100%");
    });

    it("applies the viewport to cytoscape whenever it changes", async () => {
      render(DetailConnectionsTab, { entity: entities.king });
      await Promise.resolve();
      await Promise.resolve();

      const cy = lastCy();
      cy.viewport.mockClear();

      await fireEvent.click(screen.getByTestId("connections-zoom-in"));

      expect(cy.viewport).toHaveBeenCalledWith(
        expect.objectContaining({ zoom: 1.25 }),
      );
    });

    it("leaves the page scrollable until the view is zoomed in", async () => {
      render(DetailConnectionsTab, { entity: entities.king });
      await Promise.resolve();
      const graph = screen.getByTestId("connections-graph");

      // At 1:1 a finger must still scroll the tab it sits in.
      expect(graph.style.touchAction).toBe("pan-y");

      await fireEvent.click(screen.getByTestId("connections-zoom-in"));
      await Promise.resolve();
      expect(graph.style.touchAction).toBe("none");
    });

    it("only zooms the wheel when the pinch modifier is held", async () => {
      render(DetailConnectionsTab, { entity: entities.king });
      await Promise.resolve();
      const graph = screen.getByTestId("connections-graph");

      await fireEvent.wheel(graph, { deltaY: -240 });
      expect(
        screen.getByTestId("connections-zoom-reset").textContent,
        "a plain wheel must scroll the tab, not zoom",
      ).toContain("100%");

      await fireEvent.wheel(graph, { deltaY: -240, ctrlKey: true });
      expect(
        screen.getByTestId("connections-zoom-reset").textContent,
      ).not.toContain("100%");
    });

    it("does not open a connection when the pointer was dragged across the canvas", async () => {
      render(DetailConnectionsTab, { entity: entities.king });
      await Promise.resolve();
      await Promise.resolve();
      const graph = screen.getByTestId("connections-graph");

      await fireEvent.pointerDown(graph, {
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        clientX: 100,
        clientY: 100,
      });
      await fireEvent.pointerMove(graph, {
        pointerId: 1,
        pointerType: "mouse",
        clientX: 160,
        clientY: 140,
      });
      await fireEvent.pointerUp(graph, { pointerId: 1, pointerType: "mouse" });
      tapNode(lastCy(), "duke");

      expect(vaultMock.selectedEntityId).toBeNull();

      // The next, undragged tap still opens it.
      tapNode(lastCy(), "duke");
      expect(vaultMock.selectedEntityId).toBe("duke");
    });
  });
});

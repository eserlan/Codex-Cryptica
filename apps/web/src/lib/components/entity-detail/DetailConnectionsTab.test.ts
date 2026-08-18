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
    const cy = {
      style: vi.fn(),
      batch: vi.fn((cb: () => void) => cb()),
      elements: vi.fn(() => ({ remove: vi.fn() })),
      add: vi.fn(),
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

const rowTitles = () =>
  screen
    .getAllByTestId("connection-row")
    .map((row) => row.getAttribute("data-entity-id"));

const lastCy = () => cyInstances[cyInstances.length - 1];

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

  it("renders only direct connections, in both directions, as real buttons", async () => {
    render(DetailConnectionsTab, { entity: entities.king });
    await Promise.resolve();

    expect(rowTitles().sort()).toEqual(["duke", "guard", "kingdom", "wraith"]);
  });

  it("does not render second-degree connections", async () => {
    render(DetailConnectionsTab, { entity: entities.king });
    await Promise.resolve();

    expect(rowTitles()).not.toContain("rival");
  });

  it("names each row with its full relationship for assistive tech", async () => {
    render(DetailConnectionsTab, { entity: entities.king });
    await Promise.resolve();

    expect(
      screen.getByLabelText("Open Duke Miklós (King Béla ally Duke Miklós)"),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        "Open Kingdom of Pagen (Kingdom of Pagen rules King Béla)",
      ),
    ).toBeTruthy();
  });

  it("spells out the past marker in the accessible name", async () => {
    render(DetailConnectionsTab, { entity: entities.king });
    await Promise.resolve();

    expect(
      screen.getByLabelText(
        "Open Old Wraith (past) (Old Wraith haunts King Béla)",
      ),
    ).toBeTruthy();
  });

  it("shows the relationship text next to each row", async () => {
    render(DetailConnectionsTab, { entity: entities.king });
    await Promise.resolve();

    const row = screen
      .getAllByTestId("connection-row")
      .find((r) => r.getAttribute("data-entity-id") === "duke")!;
    expect(row.textContent).toContain("ally");
  });

  it("selects a connected entity on click by default", async () => {
    render(DetailConnectionsTab, { entity: entities.king });
    await Promise.resolve();

    await fireEvent.click(
      screen
        .getAllByTestId("connection-row")
        .find((r) => r.getAttribute("data-entity-id") === "duke")!,
    );

    expect(vaultMock.selectedEntityId).toBe("duke");
  });

  it("prefers the onNavigate callback when one is given", async () => {
    const onNavigate = vi.fn();
    render(DetailConnectionsTab, { entity: entities.king, onNavigate });
    await Promise.resolve();

    await fireEvent.click(
      screen
        .getAllByTestId("connection-row")
        .find((r) => r.getAttribute("data-entity-id") === "guard")!,
    );

    expect(onNavigate).toHaveBeenCalledWith("guard", expect.anything());
    expect(vaultMock.selectedEntityId).toBeNull();
  });

  it("shows an empty state for an unconnected entity", async () => {
    render(DetailConnectionsTab, { entity: entities.hermit });
    await Promise.resolve();

    expect(screen.getByTestId("connections-empty")).toBeTruthy();
    expect(screen.queryAllByTestId("connection-row")).toHaveLength(0);
  });

  it("lists overflow past the shown cap without dropping anything", async () => {
    const crowd = Array.from({ length: 25 }, (_, i) => ({
      id: `extra-${i}`,
      type: "character",
      title: `Extra ${i}`,
      connections: [],
    })) as unknown as Entity[];
    const hub = {
      id: "hub",
      type: "faction",
      title: "The Guild",
      connections: crowd.map((c) => ({
        target: c.id,
        type: "friendly",
        label: "member",
        strength: 1,
      })),
    } as unknown as Entity;
    for (const member of [...crowd, hub]) {
      (vaultMock.entities as Record<string, Entity>)[member.id] = member;
    }
    vaultMock.allEntities = Object.values(vaultMock.entities);

    render(DetailConnectionsTab, { entity: hub });
    await Promise.resolve();

    const shown = screen.getAllByTestId("connection-row");
    expect(shown.length).toBe(20);
    expect(screen.getByTestId("connections-overflow").textContent).toContain(
      "5 more connections",
    );
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

    it("loads elements and runs a concentric layout after mount", async () => {
      render(DetailConnectionsTab, { entity: entities.king });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      const cy = lastCy();
      expect(cy.add).toHaveBeenCalled();
      const added = cy.add.mock.calls[0][0];
      expect(added.some((el: any) => el.data.isCentre)).toBe(true);
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

    it("opens a neighbour when cytoscape reports a tap on its node, ignoring the centre", async () => {
      const onNavigate = vi.fn();
      render(DetailConnectionsTab, { entity: entities.king, onNavigate });
      await Promise.resolve();
      await Promise.resolve();

      const cy = lastCy();
      cy.__emit("tap", {
        target: { id: () => "king", data: (k: string) => k === "isCentre" },
      });
      cy.__emit("tap", {
        target: { id: () => "duke", data: () => false },
        originalEvent: new MouseEvent("click"),
      });

      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onNavigate).toHaveBeenCalledWith("duke", expect.anything());
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

    it("does not open a connection when the pointer was dragged across it", async () => {
      render(DetailConnectionsTab, { entity: entities.king });
      await Promise.resolve();
      const graph = screen.getByTestId("connections-graph");
      const duke = screen
        .getAllByTestId("connection-row")
        .find((r) => r.getAttribute("data-entity-id") === "duke")!;

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
      await fireEvent.click(duke);

      expect(vaultMock.selectedEntityId).toBeNull();

      // The next, undragged click still opens it.
      await fireEvent.click(duke);
      expect(vaultMock.selectedEntityId).toBe("duke");
    });
  });
});

/** @vitest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Entity } from "schema";

const { entities, vaultMock } = vi.hoisted(() => {
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

  const hermit = {
    id: "hermit",
    type: "character",
    title: "The Hermit",
    connections: [],
  } as unknown as Entity;

  const entities = { king, duke, guard, kingdom, rival, hermit };
  const vaultMock = {
    entities,
    allEntities: Object.values(entities),
    inboundConnections: {
      king: [{ sourceId: "kingdom", connection: kingdom.connections[0] }],
      duke: [
        { sourceId: "king", connection: king.connections[0] },
        { sourceId: "rival", connection: rival.connections[0] },
      ],
      guard: [{ sourceId: "king", connection: king.connections[1] }],
    },
    isGuest: false,
    defaultVisibility: "visible",
    selectedEntityId: null as string | null,
  };
  return { entities, vaultMock };
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
vi.mock("$lib/stores/ui/layout-ui.svelte", () => ({
  layoutUIStore: { setLastSelectedNodePosition: vi.fn() },
}));

import DetailConnectionsTab from "./DetailConnectionsTab.svelte";

const nodeTitles = () =>
  screen
    .getAllByTestId("connection-node")
    .map((node) => node.getAttribute("data-entity-id"));

describe("DetailConnectionsTab", () => {
  beforeEach(() => {
    vaultMock.selectedEntityId = null;
    vaultMock.isGuest = false;
  });

  it("centres the current entity", () => {
    render(DetailConnectionsTab, { entity: entities.king });

    expect(screen.getByTestId("connections-centre").textContent).toContain(
      "King Béla",
    );
  });

  it("renders only direct connections, in both directions", () => {
    render(DetailConnectionsTab, { entity: entities.king });

    expect(nodeTitles().sort()).toEqual(["duke", "guard", "kingdom"]);
  });

  it("does not render second-degree connections", () => {
    render(DetailConnectionsTab, { entity: entities.king });

    expect(nodeTitles()).not.toContain("rival");
  });

  it("labels each edge with the relationship", () => {
    render(DetailConnectionsTab, { entity: entities.king });

    const labels = screen
      .getAllByTestId("connection-edge-label")
      .map((el) => el.textContent?.trim());
    expect(labels).toEqual(
      expect.arrayContaining(["ally", "commands", "rules"]),
    );
  });

  it("selects a connected entity on click by default", async () => {
    render(DetailConnectionsTab, { entity: entities.king });

    await fireEvent.click(
      screen
        .getAllByTestId("connection-node")
        .find((n) => n.getAttribute("data-entity-id") === "duke")!,
    );

    expect(vaultMock.selectedEntityId).toBe("duke");
  });

  it("prefers the onNavigate callback when one is given", async () => {
    const onNavigate = vi.fn();
    render(DetailConnectionsTab, { entity: entities.king, onNavigate });

    await fireEvent.click(
      screen
        .getAllByTestId("connection-node")
        .find((n) => n.getAttribute("data-entity-id") === "guard")!,
    );

    expect(onNavigate).toHaveBeenCalledWith("guard", expect.anything());
    expect(vaultMock.selectedEntityId).toBeNull();
  });

  it("names each node for assistive tech with its relationship", () => {
    render(DetailConnectionsTab, { entity: entities.king });

    expect(
      screen.getByLabelText("Open Duke Miklós (King Béla ally Duke Miklós)"),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        "Open Kingdom of Pagen (Kingdom of Pagen rules King Béla)",
      ),
    ).toBeTruthy();
  });

  it("shows an empty state for an unconnected entity", () => {
    render(DetailConnectionsTab, { entity: entities.hermit });

    expect(screen.getByTestId("connections-empty")).toBeTruthy();
    expect(screen.queryAllByTestId("connection-node")).toHaveLength(0);
    expect(screen.getByTestId("connections-centre").textContent).toContain(
      "The Hermit",
    );
  });
});

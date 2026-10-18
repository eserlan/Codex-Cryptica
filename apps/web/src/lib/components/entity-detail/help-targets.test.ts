/** @vitest-environment jsdom */
import { render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";
import { CONTROL_CATALOGUE, CONTROL_IDS } from "help-engine";

const { vaultMock } = vi.hoisted(() => ({
  vaultMock: {
    isGuest: false,
    entities: {} as Record<string, unknown>,
    selectedEntityId: null as string | null,
    addConnection: vi.fn(),
    getInboundConnections: () => [],
    inboundConnections: {},
    updateEntity: vi.fn(),
    allEntities: [] as unknown[],
  },
}));
vi.mock("$lib/stores/vault.svelte", () => ({ vault: vaultMock }));
vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: {
    jargon: {
      tab_status: "Status",
      tab_connections: "Connections",
      tab_lore: "Lore",
      tab_map: "Map",
      tab_chats: "Chats",
      tab_family: "Family",
      tab_stats: "Stats",
      tab_timeline: "Timeline",
      connections_header: "Connections",
    },
    activeTheme: { id: "default" },
    isFantasy: false,
  },
}));

import DetailTabs from "./DetailTabs.svelte";

const entity = {
  id: "e1",
  type: "location",
  title: "Oakvale",
  connections: [],
} as unknown as Entity;

describe("help target contract", () => {
  it("every catalogue control that lives on the tab strip has a matching data-help-target", () => {
    const { container } = render(DetailTabs, {
      entity,
      activeTab: "status",
      isEditing: false,
      editType: "location",
      idPrefix: "t",
    });
    const tabControls = CONTROL_IDS.filter(
      (id) =>
        CONTROL_CATALOGUE[id].area === "entity-detail" && id.endsWith("-tab"),
    );
    expect(tabControls.length).toBeGreaterThan(0);
    for (const id of tabControls) {
      expect(
        container.querySelector(`[data-help-target="${id}"]`),
        id,
      ).not.toBeNull();
    }
  });

  it("the tab targets are the real tab buttons", () => {
    const { container } = render(DetailTabs, {
      entity,
      activeTab: "status",
      isEditing: false,
      editType: "location",
      idPrefix: "t",
    });
    expect(
      container
        .querySelector('[data-help-target="status-tab"]')
        ?.getAttribute("role"),
    ).toBe("tab");
    expect(
      container
        .querySelector('[data-help-target="connections-tab"]')
        ?.getAttribute("role"),
    ).toBe("tab");
  });
});

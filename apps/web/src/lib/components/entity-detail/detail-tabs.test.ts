import { describe, expect, it } from "vitest";
import {
  createEntityDetailTabIds,
  entityDetailTabs,
  getNextEntityDetailTab,
  getNextEntityDetailTabInList,
} from "./detail-tabs";

describe("entity detail tab ids", () => {
  it("creates stable, unique ids for each tab and panel", () => {
    const { tabIds, panelIds } = createEntityDetailTabIds("entity-123");

    expect(Object.keys(tabIds)).toEqual(entityDetailTabs);
    expect(Object.keys(panelIds)).toEqual(entityDetailTabs);
    expect(new Set(Object.values(tabIds)).size).toBe(entityDetailTabs.length);
    expect(new Set(Object.values(panelIds)).size).toBe(entityDetailTabs.length);

    for (const tab of entityDetailTabs) {
      expect(tabIds[tab]).toBe(`entity-123-tab-${tab}`);
      expect(panelIds[tab]).toBe(`entity-123-panel-${tab}`);
    }
  });

  it("wraps keyboard navigation across the tab list", () => {
    expect(getNextEntityDetailTab("status", "ArrowRight")).toBe("lore");
    expect(getNextEntityDetailTab("lore", "ArrowRight")).toBe("inventory");
    expect(getNextEntityDetailTab("map", "ArrowRight")).toBe("status");
    expect(getNextEntityDetailTab("status", "ArrowLeft")).toBe("map");
    expect(getNextEntityDetailTab("inventory", "ArrowLeft")).toBe("lore");
    expect(getNextEntityDetailTab("inventory", "Home")).toBe("status");
    expect(getNextEntityDetailTab("status", "End")).toBe("map");
  });

  it("skips hidden tabs when navigating a guest-visible subset", () => {
    const visibleTabs = entityDetailTabs.filter((tab) => tab !== "lore");

    expect(
      getNextEntityDetailTabInList(visibleTabs, "status", "ArrowRight"),
    ).toBe("inventory");
    expect(
      getNextEntityDetailTabInList(visibleTabs, "inventory", "ArrowLeft"),
    ).toBe("status");
    expect(getNextEntityDetailTabInList(visibleTabs, "status", "End")).toBe(
      "map",
    );
  });
});

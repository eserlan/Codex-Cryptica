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
    expect(getNextEntityDetailTab("lore", "ArrowRight")).toBe("map");
    expect(getNextEntityDetailTab("map", "ArrowRight")).toBe("chats");
    expect(getNextEntityDetailTab("chats", "ArrowRight")).toBe("family");
    expect(getNextEntityDetailTab("family", "ArrowRight")).toBe("timeline");
    expect(getNextEntityDetailTab("timeline", "ArrowRight")).toBe("status");
    expect(getNextEntityDetailTab("status", "ArrowLeft")).toBe("timeline");
    expect(getNextEntityDetailTab("timeline", "ArrowLeft")).toBe("family");
    expect(getNextEntityDetailTab("family", "ArrowLeft")).toBe("chats");
    expect(getNextEntityDetailTab("chats", "ArrowLeft")).toBe("map");
    expect(getNextEntityDetailTab("map", "ArrowLeft")).toBe("lore");
    expect(getNextEntityDetailTab("status", "End")).toBe("timeline");
  });

  it("skips hidden tabs when navigating a guest-visible subset", () => {
    const visibleTabs = entityDetailTabs.filter((tab) => tab !== "lore");

    expect(
      getNextEntityDetailTabInList(visibleTabs, "status", "ArrowRight"),
    ).toBe("map");
    expect(getNextEntityDetailTabInList(visibleTabs, "map", "ArrowRight")).toBe(
      "chats",
    );
    expect(
      getNextEntityDetailTabInList(visibleTabs, "chats", "ArrowRight"),
    ).toBe("family");
    expect(
      getNextEntityDetailTabInList(visibleTabs, "timeline", "ArrowRight"),
    ).toBe("status");
    expect(getNextEntityDetailTabInList(visibleTabs, "map", "ArrowLeft")).toBe(
      "status",
    );
    expect(getNextEntityDetailTabInList(visibleTabs, "status", "End")).toBe(
      "timeline",
    );
  });
});

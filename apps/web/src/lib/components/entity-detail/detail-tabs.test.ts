import { describe, expect, it } from "vitest";
import {
  createEntityDetailTabIds,
  entityDetailTabs,
  getNextEntityDetailTab,
  getNextEntityDetailTabInList,
  getTemporalLabel,
  toEntityDetailTab,
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

  it("has no lore or status tab and starts with overview", () => {
    expect(entityDetailTabs).not.toContain("lore");
    expect(entityDetailTabs).not.toContain("status");
    expect(entityDetailTabs[0]).toBe("overview");
  });

  it("wraps keyboard navigation across the tab list", () => {
    expect(getNextEntityDetailTab("overview", "ArrowRight")).toBe(
      "connections",
    );
    expect(getNextEntityDetailTab("connections", "ArrowRight")).toBe("map");
    expect(getNextEntityDetailTab("map", "ArrowRight")).toBe("chats");
    expect(getNextEntityDetailTab("chats", "ArrowRight")).toBe("family");
    expect(getNextEntityDetailTab("family", "ArrowRight")).toBe("stats");
    expect(getNextEntityDetailTab("stats", "ArrowRight")).toBe("timeline");
    expect(getNextEntityDetailTab("timeline", "ArrowRight")).toBe("overview");
    expect(getNextEntityDetailTab("overview", "ArrowLeft")).toBe("timeline");
    expect(getNextEntityDetailTab("timeline", "ArrowLeft")).toBe("stats");
    expect(getNextEntityDetailTab("stats", "ArrowLeft")).toBe("family");
    expect(getNextEntityDetailTab("family", "ArrowLeft")).toBe("chats");
    expect(getNextEntityDetailTab("chats", "ArrowLeft")).toBe("map");
    expect(getNextEntityDetailTab("map", "ArrowLeft")).toBe("connections");
    expect(getNextEntityDetailTab("connections", "ArrowLeft")).toBe("overview");
    expect(getNextEntityDetailTab("overview", "End")).toBe("timeline");
    expect(getNextEntityDetailTab("timeline", "Home")).toBe("overview");
  });

  it("skips hidden tabs when navigating a subset", () => {
    const visibleTabs = entityDetailTabs.filter(
      (tab) => tab !== "chats" && tab !== "family",
    );

    expect(getNextEntityDetailTabInList(visibleTabs, "map", "ArrowRight")).toBe(
      "stats",
    );
    expect(
      getNextEntityDetailTabInList(visibleTabs, "stats", "ArrowLeft"),
    ).toBe("map");
    expect(
      getNextEntityDetailTabInList(visibleTabs, "timeline", "ArrowRight"),
    ).toBe("overview");
    expect(getNextEntityDetailTabInList(visibleTabs, "overview", "End")).toBe(
      "timeline",
    );
    expect(getNextEntityDetailTabInList([], "overview", "End")).toBe(
      "overview",
    );
  });
});

describe("toEntityDetailTab", () => {
  it("keeps a current tab id", () => {
    expect(toEntityDetailTab("stats")).toBe("stats");
    expect(toEntityDetailTab("overview")).toBe("overview");
  });

  it("opens Overview for old, missing or unknown values", () => {
    expect(toEntityDetailTab("status")).toBe("overview");
    expect(toEntityDetailTab("lore")).toBe("overview");
    expect(toEntityDetailTab(undefined)).toBe("overview");
    expect(toEntityDetailTab("bogus")).toBe("overview");
  });
});

describe("getTemporalLabel", () => {
  it("returns correct labels for known types", () => {
    expect(getTemporalLabel("character", "start")).toBe("Born");
    expect(getTemporalLabel("character", "end")).toBe("Died");
    expect(getTemporalLabel("location", "start")).toBe("Founded");
    expect(getTemporalLabel("location", "end")).toBe("Dissolved");
    expect(getTemporalLabel("item", "start")).toBe("Created");
    expect(getTemporalLabel("item", "end")).toBe("Destroyed");
    expect(getTemporalLabel("anything", "date")).toBe("Occurrence");
  });

  it("safely handles undefined and null types", () => {
    expect(getTemporalLabel(undefined, "start")).toBe("Started");
    expect(getTemporalLabel(null, "start")).toBe("Started");
    expect(getTemporalLabel(undefined, "end")).toBe("Ended");
    expect(getTemporalLabel(null, "end")).toBe("Ended");
    expect(getTemporalLabel(undefined, "date")).toBe("Occurrence");
  });
});

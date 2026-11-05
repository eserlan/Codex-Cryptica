import { describe, expect, it, vi } from "vitest";
import type { ViewPreset } from "#lib/stores/view-presets.js";
import { TableFilters } from "./table-filters.svelte.js";

describe("TableFilters", () => {
  it("toggles independent filters and measures filter and sort transitions", () => {
    const measure = vi.fn((_operation, update) => update());
    const filters = new TableFilters(measure);
    filters.toggleType("character");
    filters.toggleLabel("hero");
    filters.toggleIncompleteOnly();
    filters.handleUpdateColumnFilters({ imageMode: "missing_image" });
    expect(filters.activeFilterCount).toBe(4);
    expect(filters.hasActiveFilters).toBe(true);
    filters.toggleType("character");
    filters.toggleLabel("hero");
    expect(filters.typeFilters.size).toBe(0);
    expect(filters.labelFilters.size).toBe(0);
    filters.handleSort("title");
    expect(filters.sort).toEqual({ key: "title", direction: "desc" });
    expect(measure).toHaveBeenCalledWith("table_filter", expect.any(Function));
    expect(measure).toHaveBeenLastCalledWith(
      "table_sort",
      expect.any(Function),
    );
  });

  it("does not count whitespace or inactive column filters", () => {
    const filters = new TableFilters();
    filters.setSearchQuery("  ");
    filters.columnFilters = { imageMode: "all", labelValues: new Set() };
    expect(filters.hasActiveFilters).toBe(false);
    expect(filters.activeFilterCount).toBe(0);
    filters.setSearchQuery("dragon");
    expect(filters.hasActiveFilters).toBe(true);
    expect(filters.activeFilterCount).toBe(0);
  });

  it.each([
    ["audit", null, true, "findings"],
    [null, "true", true, "findings"],
    ["overview", null, true, "distribution"],
    ["overview", "true", true, "findings"],
    [null, null, false, "findings"],
  ] as const)("syncs audit URL mode %s/%s", (mode, audit, open, tab) => {
    const filters = new TableFilters();
    filters.syncAuditMode(mode, audit);
    expect(filters.showAuditPanel).toBe(open);
    expect(filters.auditPanelTab).toBe(tab);
    filters.toggleAuditPanel();
    expect(filters.showAuditPanel).toBe(!open);
  });

  it("toggles distribution selections without clearing unrelated filters", () => {
    const filters = new TableFilters();
    filters.searchQuery = "dragon";
    filters.columnFilters = { imageMode: "missing_image" };
    filters.handleSelectDistributionCategory("character");
    filters.handleSelectDistributionLabel("hero");
    expect(filters.typeFilters).toEqual(new Set(["character"]));
    expect(filters.labelFilters).toEqual(new Set(["hero"]));
    filters.handleSelectDistributionUnlabelled();
    expect(filters.labelFilters.size).toBe(0);
    expect(filters.columnFilters).toEqual({
      imageMode: "missing_image",
      labelMode: "missing",
    });
    filters.handleSelectDistributionUnlabelled();
    expect(filters.columnFilters.labelMode).toBe("all");
    filters.handleSelectDistributionCategory("character");
    filters.handleSelectDistributionLabel("hero");
    filters.handleSelectDistributionLabel("hero");
    expect(filters.typeFilters.size).toBe(0);
    expect(filters.labelFilters.size).toBe(0);
    expect(filters.searchQuery).toBe("dragon");
  });

  it.each([
    ["missing_images", { imageMode: "missing_image" }],
    ["missing_descriptions", { summaryMode: "missing_summary" }],
    ["zero_connections", { connectionsMode: "zero" }],
    ["unlabelled", { labelMode: "missing" }],
    ["incomplete", {}],
  ] as const)("replaces filters for the %s finding", (finding, columns) => {
    const filters = new TableFilters();
    filters.searchQuery = "dragon";
    filters.toggleType("character");
    filters.toggleLabel("hero");
    filters.handleAuditDrillDown(finding);
    expect(filters.columnFilters).toEqual(columns);
    expect(filters.showIncompleteOnly).toBe(finding === "incomplete");
    expect(filters.searchQuery).toBe("");
    expect(filters.typeFilters.size + filters.labelFilters.size).toBe(0);
  });

  it("copies presets, preserves unspecified sort, and distinguishes clear from reset", () => {
    const filters = new TableFilters();
    filters.handleSort("title");
    filters.handleApplyAuditPreset({
      id: "flagged",
      title: "Flagged",
      description: "",
      icon: "",
      showIncompleteOnly: true,
    });
    expect(filters.activeAuditPresetId).toBe("flagged");
    expect(filters.showIncompleteOnly).toBe(true);
    const state = {
      activeCategories: ["character"],
      activeLabels: ["hero"],
      searchQuery: "dragon",
      columnFilters: { imageMode: "missing_image" as const },
    };
    filters.handleApplyPreset({ state } as ViewPreset);
    expect(filters.activeAuditPresetId).toBeNull();
    expect(filters.columnFilters).not.toBe(state.columnFilters);
    expect(filters.sort.direction).toBe("desc");
    filters.clearFilters();
    expect(filters.hasActiveFilters).toBe(false);
    expect(filters.sort.direction).toBe("desc");
    filters.handleResetFilters();
    expect(filters.sort).toEqual({ key: "title", direction: "asc" });
    filters.handleApplyPreset({
      state: { ...state, tableSort: { key: "modified", direction: "desc" } },
    } as ViewPreset);
    expect(filters.sort.key).toBe("modified");
  });
});

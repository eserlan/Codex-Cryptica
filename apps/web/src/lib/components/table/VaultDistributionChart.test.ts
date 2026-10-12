/** @vitest-environment jsdom */

import { render, fireEvent, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import VaultDistributionChart from "./VaultDistributionChart.svelte";
import type { VaultDistributionSummary } from "./vaultDistribution";

const mockSummary: VaultDistributionSummary = {
  totalUniqueEntities: 360,
  filteredUniqueEntities: 360,
  isFiltered: false,
  categories: [
    {
      id: "character",
      label: "Characters",
      count: 200,
      totalCount: 200,
      percentage: 55.6,
      color: "#f43f5e",
      icon: "icon-[lucide--user]",
    },
    {
      id: "faction",
      label: "Factions",
      count: 120,
      totalCount: 120,
      percentage: 33.3,
      color: "#8b5cf6",
      icon: "icon-[lucide--shield]",
    },
    {
      id: "location",
      label: "Locations",
      count: 40,
      totalCount: 40,
      percentage: 11.1,
      color: "#06b6d4",
      icon: "icon-[lucide--map-pin]",
    },
  ],
  labels: [
    {
      id: "Pagen",
      label: "Pagen",
      count: 150,
      totalCount: 150,
      percentage: 41.7,
      icon: "icon-[lucide--tag]",
    },
    {
      id: "Major",
      label: "Major",
      count: 80,
      totalCount: 80,
      percentage: 22.2,
      icon: "icon-[lucide--tag]",
    },
    {
      id: "__unlabelled__",
      label: "Unlabelled",
      count: 25,
      totalCount: 25,
      percentage: 6.9,
      isUnlabelled: true,
      icon: "icon-[lucide--tag-off]",
    },
  ],
  unlabelledCount: 25,
  unlabelledTotalCount: 25,
};

describe("VaultDistributionChart component", () => {
  it("renders exact category bars, counts, and percentages", () => {
    const onSelectCategory = vi.fn();
    const onSelectLabel = vi.fn();
    const onSelectUnlabelled = vi.fn();

    render(VaultDistributionChart, {
      summary: mockSummary,
      onSelectCategory,
      onSelectLabel,
      onSelectUnlabelled,
    });

    expect(screen.getByTestId("distribution-bar-character")).toBeDefined();
    expect(
      screen.getByTestId("distribution-count-character").textContent?.trim(),
    ).toBe("200");
    expect(
      screen.getByTestId("distribution-count-faction").textContent?.trim(),
    ).toBe("120");
    expect(
      screen.getByTestId("distribution-count-location").textContent?.trim(),
    ).toBe("40");

    expect(
      screen.getByTestId("distribution-summary-text").textContent,
    ).toContain("360 unique entities in vault");
  });

  it("handles category drill-down clicks", async () => {
    const onSelectCategory = vi.fn();
    const onSelectLabel = vi.fn();
    const onSelectUnlabelled = vi.fn();

    render(VaultDistributionChart, {
      summary: mockSummary,
      onSelectCategory,
      onSelectLabel,
      onSelectUnlabelled,
    });

    const charBar = screen.getByTestId("distribution-bar-character");
    await fireEvent.click(charBar);

    expect(onSelectCategory).toHaveBeenCalledTimes(1);
    expect(onSelectCategory).toHaveBeenCalledWith("character");
  });

  it("switches to By Label mode and displays overlap note and label drilldown", async () => {
    const onSelectCategory = vi.fn();
    const onSelectLabel = vi.fn();
    const onSelectUnlabelled = vi.fn();

    render(VaultDistributionChart, {
      summary: mockSummary,
      onSelectCategory,
      onSelectLabel,
      onSelectUnlabelled,
    });

    const labelGroupBtn = screen.getByTestId("distribution-group-label");
    await fireEvent.click(labelGroupBtn);

    expect(screen.getByTestId("distribution-label-note")).toBeDefined();
    expect(screen.getByTestId("distribution-bar-Pagen")).toBeDefined();
    expect(
      screen.getByTestId("distribution-count-Pagen").textContent?.trim(),
    ).toBe("150");

    // Click regular label
    await fireEvent.click(screen.getByTestId("distribution-bar-Pagen"));
    expect(onSelectLabel).toHaveBeenCalledWith("Pagen");

    // Click unlabelled item
    await fireEvent.click(
      screen.getByTestId("distribution-bar-__unlabelled__"),
    );
    expect(onSelectUnlabelled).toHaveBeenCalledTimes(1);
  });

  it("toggles to data table view and allows row action clicks", async () => {
    const onSelectCategory = vi.fn();
    const onSelectLabel = vi.fn();
    const onSelectUnlabelled = vi.fn();

    render(VaultDistributionChart, {
      summary: mockSummary,
      onSelectCategory,
      onSelectLabel,
      onSelectUnlabelled,
    });

    const tableViewBtn = screen.getByTestId("distribution-view-table");
    await fireEvent.click(tableViewBtn);

    expect(screen.getByTestId("distribution-table-wrap")).toBeDefined();
    expect(screen.getByTestId("distribution-row-character")).toBeDefined();

    const filterBtn = screen.getByTestId("distribution-filter-btn-character");
    await fireEvent.click(filterBtn);
    expect(onSelectCategory).toHaveBeenCalledWith("character");
  });

  it("displays filtered entity ratio text when filtered", () => {
    const filteredSummary: VaultDistributionSummary = {
      ...mockSummary,
      isFiltered: true,
      filteredUniqueEntities: 42,
    };

    render(VaultDistributionChart, {
      summary: filteredSummary,
      onSelectCategory: vi.fn(),
      onSelectLabel: vi.fn(),
      onSelectUnlabelled: vi.fn(),
    });

    const summaryText = screen
      .getByTestId("distribution-summary-text")
      .textContent?.replace(/\s+/g, " ")
      .trim();
    expect(summaryText).toContain("42 of 360 entities matching filters");
  });

  it("renders empty state when items are empty", () => {
    const emptySummary: VaultDistributionSummary = {
      totalUniqueEntities: 0,
      filteredUniqueEntities: 0,
      isFiltered: false,
      categories: [],
      labels: [],
      unlabelledCount: 0,
      unlabelledTotalCount: 0,
    };

    render(VaultDistributionChart, {
      summary: emptySummary,
      onSelectCategory: vi.fn(),
      onSelectLabel: vi.fn(),
      onSelectUnlabelled: vi.fn(),
    });

    expect(screen.getByTestId("distribution-empty")).toBeDefined();
  });
});

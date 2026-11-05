import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import TableControls from "./TableControls.svelte";
import { TableFilters } from "./table-filters.svelte.js";
import { computeVaultAuditCounts } from "#lib/components/table/vaultAudit.js";
import { computeVaultDistribution } from "#lib/components/table/vaultDistribution.js";

function setup(typeCounts = new Map<string, number>()) {
  const filters = new TableFilters();
  render(TableControls, {
    filters,
    vaultId: "test-vault",
    typeCounts,
    incompleteCount: 2,
    auditCounts: computeVaultAuditCounts([]),
    distributionSummary: computeVaultDistribution([], [], []),
    searchStatusMessage: "Searching indexed content…",
  });
  return filters;
}

describe("TableControls", () => {
  it("connects mobile and desktop controls to the same state and announces search status", async () => {
    const filters = setup(new Map([["character", 2]]));
    const toggle = screen.getByTestId("entity-table-mobile-filters-toggle");
    expect(toggle.getAttribute("aria-controls")).toBe(
      "entity-table-filter-panel",
    );
    await fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    await fireEvent.click(screen.getByTestId("entity-table-incomplete-filter"));
    expect(filters.showIncompleteOnly).toBe(true);
    expect(
      screen
        .getByTestId("entity-table-active-filter-badge")
        .textContent?.trim(),
    ).toBe("1");
    await fireEvent.click(
      screen.getByTestId("entity-table-mobile-audit-toggle"),
    );
    expect(
      screen
        .getByTestId("entity-table-audit-toggle")
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByTestId("vault-audit-panel")).toBeTruthy();
    await fireEvent.click(screen.getByTestId("vault-audit-close"));
    expect(screen.queryByTestId("vault-audit-panel")).toBeNull();
    expect(
      screen.getByText("Searching indexed content…").getAttribute("aria-live"),
    ).toBe("polite");
  });

  it("omits the filter panel association when there are no filters or types", () => {
    setup();
    expect(
      screen
        .getByTestId("entity-table-mobile-filters-toggle")
        .hasAttribute("aria-controls"),
    ).toBe(false);
    expect(screen.queryByTestId("entity-table-active-filter-badge")).toBeNull();
    expect(document.getElementById("entity-table-filter-panel")).toBeNull();
  });
});

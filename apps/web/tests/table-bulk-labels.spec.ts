import { test, expect } from "@playwright/test";
import { seedEntities, setupVaultPage } from "./test-helpers";

/**
 * Entity Table — row selection + bulk label actions (#1516).
 * Mirrors the graph bulk-labels coverage: select a set of rows, apply a label
 * to all of them via the shared BulkLabelDialog, and confirm the action ran
 * over the selection (notification count + the label surfacing as recent).
 */
test.describe("Table row selection + bulk labels", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  test("select rows and bulk-apply a label to the selection", async ({
    page,
  }) => {
    await seedEntities(page, [
      { title: "Alpha" },
      { title: "Beta" },
      { title: "Gamma" },
    ]);

    await page.goto("/table");

    const rows = page.getByTestId("entity-table-row");
    await expect(rows).toHaveCount(3);

    // Select Alpha and Beta via their row checkboxes — Gamma stays unselected.
    await rows
      .filter({ hasText: "Alpha" })
      .getByTestId("entity-table-row-select")
      .check();
    await rows
      .filter({ hasText: "Beta" })
      .getByTestId("entity-table-row-select")
      .check();

    await expect(page.getByTestId("entity-table-selection-count")).toHaveText(
      "2 selected",
    );

    // Open the shared bulk label dialog scoped to the selection.
    await page.getByTestId("entity-table-bulk-label").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Label 2/i })).toBeVisible();

    // Apply a label to all selected — notification confirms the count (2),
    // proving the bulk action targeted exactly the selected rows.
    await page.getByPlaceholder("Label name…").fill("party");
    await page.getByRole("button", { name: "Apply to all" }).click();
    await expect(page.getByText(/Label "party" applied to 2/)).toBeVisible();

    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Re-opening the dialog surfaces the just-applied label as a recent one
    // (mirrors the graph bulk-labels assertion that the apply persisted).
    await page.getByTestId("entity-table-bulk-label").click();
    await page.getByPlaceholder("Label name…").click();
    await expect(page.getByText("Recent Labels")).toBeVisible();
    await expect(page.getByRole("option", { name: "party" })).toBeVisible();
  });

  test("select-all toggles every filtered row and clears on filter change", async ({
    page,
  }) => {
    await seedEntities(page, [
      { title: "Knight", type: "character" },
      { title: "Castle", type: "location" },
    ]);

    await page.goto("/table");
    await expect(page.getByTestId("entity-table-row")).toHaveCount(2);

    // Header select-all selects every filtered row.
    await page.getByTestId("entity-table-select-all").check();
    await expect(page.getByTestId("entity-table-selection-count")).toHaveText(
      "2 selected",
    );

    // Changing the filter set clears the selection (and its toolbar).
    await page.getByTestId("entity-table-search").fill("Knight");
    await expect(page.getByTestId("entity-table-row")).toHaveCount(1);
    await expect(
      page.getByTestId("entity-table-selection-toolbar"),
    ).toHaveCount(0);
  });
});

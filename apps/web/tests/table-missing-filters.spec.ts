import { test, expect } from "@playwright/test";
import { seedEntities, setupVaultPage } from "./test-helpers";

/**
 * Entity Table — missing-data visibility and filter reset (#1515).
 */
test.describe("Table missing-data visibility & filters", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  test("toggle incomplete only filters to incomplete entities and clear filters resets view", async ({
    page,
  }) => {
    await seedEntities(page, [
      {
        title: "Complete Hero",
        content: "A veteran knight of the realm with full lore.",
        data: {
          labels: ["Hero", "Knight"],
          connections: [
            { target: "Incomplete Location", type: "located_in", strength: 1 },
          ],
        },
      },
      {
        title: "Incomplete Location",
        content: "",
        data: {
          labels: [],
          connections: [],
        },
      },
    ]);

    await page.goto("/table");

    const rows = page.getByTestId("entity-table-row");
    await expect(rows).toHaveCount(2);

    // Toggle "Incomplete only"
    const incompleteBtn = page.getByTestId("entity-table-incomplete-filter");
    await expect(incompleteBtn).toBeVisible();
    await incompleteBtn.click();

    // Only Incomplete Location should be visible
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Incomplete Location");
    await expect(rows.first()).toContainText("Missing summary");
    await expect(rows.first()).toContainText("No labels");

    // Clear all filters resets table
    const clearBtn = page.getByTestId("entity-table-clear-filters");
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    await expect(rows).toHaveCount(2);
  });
});

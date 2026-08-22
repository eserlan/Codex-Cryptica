import { test, expect } from "@playwright/test";
import { seedEntities, setupVaultPage } from "./test-helpers";

test.describe("Table View Label Autocomplete", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  test("suggests and autocompletes labels when typing # in table search and applies local filter", async ({
    page,
  }) => {
    await seedEntities(page, [
      { title: "Alpha Hero", data: { labels: ["Champion", "Hero"] } },
      { title: "Beta Village", data: { labels: ["Village", "Safehouse"] } },
      { title: "Gamma Dragon", data: { labels: ["Boss", "Quest"] } },
    ]);

    await page.goto("/table");

    const rows = page.getByTestId("entity-table-row");
    await expect(rows).toHaveCount(3);

    const searchInput = page.getByTestId("entity-table-search");
    await expect(searchInput).toBeVisible();

    // 1. Typing # opens label autocomplete with suggestions
    await searchInput.click();
    await searchInput.pressSequentially("#");

    const autocomplete = page.getByTestId("table-search-autocomplete");
    await expect(autocomplete).toBeVisible();

    // 2. Typing more filters the list
    await searchInput.pressSequentially("vil");
    const options = page.getByTestId("table-search-autocomplete-option");
    await expect(options).toHaveCount(1);
    await expect(options.first()).toContainText("Village");

    // 3. Clicking suggestion applies the label filter chip and cleans the query
    await options.first().click();
    await expect(searchInput).toHaveValue("");
    await expect(autocomplete).not.toBeVisible();

    // Only Beta Village should be shown in table rows
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Beta Village");

    // 4. Verify Explorer UI Store is decoupled and has not been mutated
    const explorerLabelsCount = await page.evaluate(() => {
      const store = (window as any).explorerUIStore;
      return store?.labelFilters?.size ?? 0;
    });
    expect(explorerLabelsCount).toBe(0);
  });

  test("keyboard navigation works in table search label autocomplete", async ({
    page,
  }) => {
    await seedEntities(page, [
      { title: "Alpha Hero", data: { labels: ["Hero"] } },
      { title: "Beta Village", data: { labels: ["Village"] } },
    ]);

    await page.goto("/table");

    const rows = page.getByTestId("entity-table-row");
    await expect(rows).toHaveCount(2);

    const searchInput = page.getByTestId("entity-table-search");
    await searchInput.click();
    await searchInput.pressSequentially("#");

    const autocomplete = page.getByTestId("table-search-autocomplete");
    await expect(autocomplete).toBeVisible();

    // Navigate with ArrowDown and select with Enter
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    await expect(autocomplete).not.toBeVisible();
    await expect(searchInput).toHaveValue("");
    await expect(rows).toHaveCount(1);
  });
});

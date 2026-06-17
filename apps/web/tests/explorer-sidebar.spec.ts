import { test, expect } from "@playwright/test";
import { openOracle, seedEntity, setupVaultPage } from "./test-helpers";

test.describe("Entity Explorer Sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  test("should toggle explorer sidebar and show entity list", async ({
    page,
  }) => {
    // 1. Locate activity bar buttons
    const oracleBtn = page.getByTestId("activity-bar-oracle");
    const explorerBtn = page.getByTestId("activity-bar-explorer");
    await expect(oracleBtn).toBeVisible();
    await expect(explorerBtn).toBeVisible();

    // 2. Open Explorer
    await explorerBtn.click();

    // 3. Verify sidebar host is visible
    const host = page.getByTestId("sidebar-panel-host");
    await expect(host).toBeVisible();

    // 4. Verify Entity Explorer content
    await expect(page.getByText("Entity Explorer")).toBeVisible();
    await expect(page.getByPlaceholder("Search entities...")).toBeVisible();

    // 5. Close Explorer
    await page.getByLabel("Close Explorer").click();
    await expect(host).not.toBeVisible();
  });

  test("should swap between Oracle and Explorer", async ({ page }) => {
    const oracleBtn = page.getByTestId("activity-bar-oracle");
    const explorerBtn = page.getByTestId("activity-bar-explorer");

    // Open Oracle
    await openOracle(page);
    await expect(page.getByTestId("oracle-sidebar-panel")).toBeVisible();

    // Click Explorer
    await explorerBtn.click();
    await expect(page.getByTestId("oracle-sidebar-panel")).not.toBeVisible();
    await expect(page.getByText("Entity Explorer")).toBeVisible();

    // Click Oracle again
    await oracleBtn.click();
    await expect(page.getByText("Entity Explorer")).not.toBeVisible();
    await expect(page.getByTestId("oracle-sidebar-panel")).toBeVisible();
  });

  test("should focus entity and show embedded view", async ({ page }) => {
    // 1. Open Explorer
    await page.getByTestId("activity-bar-explorer").click();

    // Ensure explorer is loaded
    await expect(page.getByTestId("entity-explorer-panel")).toBeVisible();

    await seedEntity(page, {
      id: "test-entry",
      title: "Test Entry",
      type: "npc",
      content: "Test content",
      data: {
        lore: "Test lore",
        labels: ["test"],
      },
    });

    // 2. Click the seeded entity
    const entityRow = page.getByTestId("entity-list-item").first();

    const isVisible = await entityRow.isVisible().catch(() => false);
    if (!isVisible) {
      const noEntities = page.getByTestId("no-entities-found");
      if (await noEntities.isVisible()) {
        console.log("Empty state visible instead of seeded entity");
      }
    }

    await expect(entityRow).toBeVisible({ timeout: 10000 });
    await entityRow.click();

    // 3. Verify Zen Mode dialog is visible
    const dialog = page.getByRole("dialog", { name: "Test Entry" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Test content")).toBeVisible();

    // 4. Close Zen Mode
    await dialog.getByLabel("Close").click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByTestId("graph-canvas")).toBeVisible();
  });
});

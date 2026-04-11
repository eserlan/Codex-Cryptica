import { test, expect } from "@playwright/test";

test.describe("Entity Explorer Sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      try {
        localStorage.setItem("codex_skip_landing", "true");
      } catch {
        /* ignore */
      }
    });

    // Seed a known entity and dismiss front page for testing focus mode
    await page.addInitScript(() => {
      const checkVaultAndUI = () => {
        const v = (window as any).vault;
        const ui = (window as any).uiStore;
        if (v && v.repository && ui) {
          // Manually populate repository entities to trigger reactivity
          v.repository.entities = {
            "test-entry": {
              id: "test-entry",
              title: "Test Entry",
              type: "npc",
              content: "Test content",
              lore: "Test lore",
              labels: ["test"],
              connections: [],
              updatedAt: Date.now(),
              _path: ["test-entry.md"],
            },
          };
          v.isInitialized = true;
          v.status = "idle";
          ui.dismissedWorldPage = true;
        } else {
          setTimeout(checkVaultAndUI, 20);
        }
      };
      checkVaultAndUI();
    });

    await page.goto("/");
    // Wait for vault to be idle
    await page.waitForFunction(() => (window as any).vault?.status === "idle", {
      timeout: 15000,
    });
    // Reliably dismiss the front-page overlay (initScript polling may lose the race)
    await page.evaluate(() => {
      const ui = (window as any).uiStore;
      if (ui) {
        ui.dismissedWorldPage = true;
        ui.isLandingPageVisible = false;
      }
    });
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
    await oracleBtn.click();
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

    // Re-seed to ensure it's there after vault init
    await page.evaluate(() => {
      const v = (window as any).vault;
      if (v && v.repository) {
        v.repository.entities = {
          "test-entry": {
            id: "test-entry",
            title: "Test Entry",
            type: "npc",
            content: "Test content",
            lore: "Test lore",
            labels: ["test"],
            connections: [],
            updatedAt: Date.now(),
            _path: ["test-entry.md"],
          },
        };
        v.entities = { ...v.repository.entities };
        v.isInitialized = true;
        v.status = "idle";
      }
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

    // 3. Verify Embedded View is visible
    await expect(page.getByTestId("embedded-entity-view")).toBeVisible();

    // 4. Verify Graph is NOT visible
    await expect(page.getByTestId("graph-canvas")).not.toBeVisible();

    // 5. Close focus mode
    await page.getByTestId("embedded-entity-view").getByLabel("Close").click();
    await expect(page.getByTestId("embedded-entity-view")).not.toBeVisible();
    await expect(page.getByTestId("graph-canvas")).toBeVisible();
  });
});

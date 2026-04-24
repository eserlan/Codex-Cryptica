import { test, expect } from "@playwright/test";

test.describe("Adjustable Sidebars", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Bypass landing page if present, enable E2E mode, and reset sidebar widths
    await page.evaluate(() => {
      (window as any).__E2E__ = true;
      window.localStorage.setItem("codex_skip_landing", "true");
      window.localStorage.setItem("codex_left_sidebar_width", "280");
      window.localStorage.setItem("codex_right_sidebar_width", "380");
      window.localStorage.setItem(
        "codex_world_page_dismissed_at",
        String(Date.now()),
      );
    });
    await page.reload();
    // Wait for vault to be ready
    await page.evaluate(async () => {
      (window as any).__E2E__ = true;
      let attempts = 0;
      while (!(window as any).vault?.isInitialized && attempts < 100) {
        await new Promise((r) => setTimeout(r, 100));
        attempts++;
      }
    });
  });

  test("left sidebar can be resized and persists", async ({ page }) => {
    const explorerButton = page.locator(
      'button[data-testid="activity-bar-explorer"], button[aria-label="Entity Explorer"]',
    );
    await expect(explorerButton).toBeVisible();
    await explorerButton.first().click();

    const sidebar = page.locator('[data-testid="sidebar-panel-host"]');
    await expect(sidebar).toBeVisible();

    // Default width check
    const initialBox = await sidebar.boundingBox();
    expect(initialBox).not.toBeNull();
    const initialWidth = initialBox!.width;

    const handle = page.locator('[data-testid="resizer-handle-left"]');
    await expect(handle).toBeVisible();

    // Drag handle to the right
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(
      initialBox!.x + initialBox!.width + 100,
      initialBox!.y + 100,
      { steps: 10 },
    );
    await page.mouse.up();

    // Check new width
    const newBox = await sidebar.boundingBox();
    expect(newBox?.width).toBeGreaterThan(initialWidth + 50);

    // Reload page to check persistence
    await page.reload();

    // Re-enable E2E and skip landing after reload
    await page.evaluate(async () => {
      (window as any).__E2E__ = true;
      window.localStorage.setItem("codex_skip_landing", "true");
      let attempts = 0;
      while (!(window as any).vault?.isInitialized && attempts < 100) {
        await new Promise((r) => setTimeout(r, 100));
        attempts++;
      }
    });

    await page
      .locator(
        'button[data-testid="activity-bar-explorer"], button[aria-label="Entity Explorer"]',
      )
      .first()
      .click();

    const reloadedSidebar = page.locator('[data-testid="sidebar-panel-host"]');
    await expect(reloadedSidebar).toBeVisible();

    const reloadedBox = await reloadedSidebar.boundingBox();
    expect(reloadedBox?.width).toBeCloseTo(newBox!.width, 1);
  });

  test("right sidebar can be resized and persists", async ({ page }) => {
    // Need to focus an entity to open the right sidebar
    await page.evaluate(async () => {
      (window as any).__E2E__ = true;
      const vault = (window as any).vault;
      if (!vault) return;

      // Mock an entity selection
      vault.entityStore.entities["test-entity"] = {
        id: "test-entity",
        title: "Test Entity",
        type: "note",
        content: "Lore content",
      };
      vault.selectedEntityId = "test-entity";
    });

    const sidebar = page.locator('[data-testid="entity-detail-panel"]');
    // It might take a moment for dynamic components to load
    await expect(sidebar).toBeVisible({ timeout: 20000 });

    // Default width check
    const initialBox = await sidebar.boundingBox();
    expect(initialBox).not.toBeNull();
    const initialWidth = initialBox!.width;

    const handle = page.locator('[data-testid="resizer-handle-right"]');
    await expect(handle).toBeVisible();

    // Drag handle to the left (increases width)
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(initialBox!.x - 100, initialBox!.y + 100, {
      steps: 10,
    });
    await page.mouse.up();

    // Check new width
    const newBox = await sidebar.boundingBox();
    expect(newBox?.width).toBeGreaterThan(initialWidth + 50);

    // Reload page to check persistence
    await page.reload();

    // Restore state
    await page.evaluate(async () => {
      (window as any).__E2E__ = true;
      let attempts = 0;
      while (!(window as any).vault?.isInitialized && attempts < 100) {
        await new Promise((r) => setTimeout(r, 100));
        attempts++;
      }

      const vault = (window as any).vault;
      if (!vault) return;

      vault.entityStore.entities["test-entity"] = {
        id: "test-entity",
        title: "Test Entity",
        type: "note",
        content: "Lore content",
      };
      vault.selectedEntityId = "test-entity";
    });

    const reloadedSidebar = page.locator('[data-testid="entity-detail-panel"]');
    await expect(reloadedSidebar).toBeVisible({ timeout: 20000 });

    const reloadedBox = await reloadedSidebar.boundingBox();
    expect(reloadedBox?.width).toBeCloseTo(newBox!.width, 1);
  });
});

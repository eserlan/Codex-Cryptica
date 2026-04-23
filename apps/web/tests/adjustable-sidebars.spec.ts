import { test, expect } from "@playwright/test";

test.describe("Adjustable Sidebars", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Bypass landing page if present
    await page.evaluate(() => {
      window.localStorage.setItem("codex_skip_landing", "true");
      window.localStorage.setItem(
        "codex_world_page_dismissed_at",
        String(Date.now()),
      );
    });
    await page.reload();
  });

  test("left sidebar can be resized and persists", async ({ page }) => {
    // Open left sidebar (explorer)
    await page
      .locator(
        'button[data-testid="sidebar-toggle-explorer"], button[aria-label="Toggle Explorer"]',
      )
      .first()
      .click();

    const sidebar = page.locator('[data-testid="sidebar-panel-host"]');
    await expect(sidebar).toBeVisible();

    // Default width check (approx 280)
    const initialBox = await sidebar.boundingBox();
    expect(initialBox?.width).toBeCloseTo(280, -1);

    const handle = page
      .locator(
        '.resizer-handle.right-full, .resizer-handle:has-class(-mr-1), [role="separator"][aria-orientation="vertical"]',
      )
      .first();

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
    expect(newBox?.width).toBeGreaterThan(280);

    // Reload page to check persistence
    await page.reload();
    await page
      .locator(
        'button[data-testid="sidebar-toggle-explorer"], button[aria-label="Toggle Explorer"]',
      )
      .first()
      .click();

    const reloadedSidebar = page.locator('[data-testid="sidebar-panel-host"]');
    await expect(reloadedSidebar).toBeVisible();

    const reloadedBox = await reloadedSidebar.boundingBox();
    expect(reloadedBox?.width).toBeCloseTo(newBox!.width, 0);
  });
});

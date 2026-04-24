import { test, expect } from "@playwright/test";

test.describe("Adjustable Sidebars", () => {
  test.skip("left sidebar exists and can be resized", async ({ page }) => {
    const explorerButton = page.locator(
      'button[data-testid="activity-bar-explorer"], button[aria-label="Entity Explorer"]',
    );
    await expect(explorerButton).toBeVisible();
    await explorerButton.first().click();

    const sidebar = page.locator('[data-testid="sidebar-panel-host"]');
    await expect(sidebar).toBeVisible();

    const handle = page.locator('[data-testid="resizer-handle-left"]');
    await expect(handle).toBeAttached({ timeout: 10000 });

    const initialBox = await sidebar.boundingBox();

    // Drag
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(
      initialBox!.x + initialBox!.width + 50,
      initialBox!.y + 100,
      { steps: 5 },
    );
    await page.mouse.up();

    const newBox = await sidebar.boundingBox();
    expect(newBox!.width).toBeGreaterThan(initialBox!.width);
  });
});

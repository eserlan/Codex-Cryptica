import { test, expect } from "@playwright/test";

test.describe("Oracle Sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      localStorage.setItem("codex_skip_landing", "true");
    });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await page.waitForTimeout(2000);
    // Wait for vault to be idle
    await page.waitForFunction(() => (window as any).vault?.status === "idle", {
      timeout: 15000,
    });
  });

  test("should toggle oracle sidebar and expand workspace", async ({
    page,
  }) => {
    // 1. Locate reveal button
    const sidebarBtn = page.getByTestId("sidebar-oracle-button");
    await expect(sidebarBtn).toBeVisible();

    // 2. Measure initial workspace width (collapsed)
    const canvas = page.getByTestId("graph-canvas");
    await expect(canvas).toBeVisible();
    const initialBox = await canvas.boundingBox();
    const initialWidth = initialBox?.width || 0;

    // 3. Click to open Oracle
    await sidebarBtn.click();

    // 4. Verify panel is visible and reveal button is hidden
    const panel = page.getByTestId("oracle-sidebar-panel");
    await expect(panel).toBeVisible();
    await expect(sidebarBtn).not.toBeVisible();

    // Wait for transition animation
    await page.waitForTimeout(500);

    // 5. Verify panel is at the very left (x=0)
    const panelBox = await panel.boundingBox();
    expect(panelBox?.x).toBeCloseTo(0, 1);

    // 6. Verify workspace resized (should be smaller now)
    const openBox = await canvas.boundingBox();
    const openWidth = openBox?.width || 0;
    expect(openWidth).toBeLessThan(initialWidth);

    // 7. Click to close Oracle (using the close button in panel header)
    await page.getByLabel("Close panel").click();
    await expect(panel).not.toBeVisible();
    await expect(sidebarBtn).toBeVisible();

    // 8. Verify workspace returned to full width
    const closedBox = await canvas.boundingBox();
    const closedWidth = closedBox?.width || 0;
    expect(closedWidth).toBeCloseTo(initialWidth, 1);
  });

  test("should persist oracle state across navigation", async ({ page }) => {
    const sidebarBtn = page.getByTestId("sidebar-oracle-button");
    const panel = page.getByTestId("oracle-sidebar-panel");

    // Open Oracle
    await sidebarBtn.click();
    await expect(panel).toBeVisible();

    // Navigate to Map
    await page.click('nav a:has-text("MAP")');
    await expect(page).toHaveURL(/\/map/);

    // Verify Oracle is STILL open
    await expect(panel).toBeVisible();

    // Navigate back to Graph
    await page.click('nav a:has-text("GRAPH")');
    await expect(page).toHaveURL(/\/$/);
    await expect(panel).toBeVisible();
  });

  test("should adapt layout for mobile viewports", async ({ page }) => {
    // Switch to mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const sidebarBtn = page.getByTestId("sidebar-oracle-button");
    const panel = page.getByTestId("oracle-sidebar-panel");

    // Click to open
    await sidebarBtn.click();

    // Verify panel opens as an overlay
    await expect(panel).toBeVisible();
    const panelBox = await panel.boundingBox();
    expect(panelBox?.width).toBeCloseTo(375, 1); // Should span full width
    expect(panelBox?.height).toBeGreaterThan(600); // Should span most of height
  });
});

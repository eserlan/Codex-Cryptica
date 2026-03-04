import { test, expect } from "@playwright/test";

test.describe("Oracle Sidebar", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => console.log(`[PAGE] ${msg.text()}`));
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
    // 1. Verify floating orb is NOT visible
    const orb = page.getByTestId("oracle-orb");
    await expect(orb).not.toBeVisible();

    // 2. Locate sidebar button
    const sidebarBtn = page.getByTestId("sidebar-oracle-button");
    await page.screenshot({ path: "debug-layout.png" });
    await expect(sidebarBtn).toBeVisible();

    // 3. Measure initial workspace width (collapsed)
    const canvas = page.getByTestId("graph-canvas");
    await expect(canvas).toBeVisible();
    const initialBox = await canvas.boundingBox();
    const initialWidth = initialBox?.width || 0;

    // 4. Click to open Oracle
    await sidebarBtn.click();

    // 5. Verify panel is visible
    const panel = page.getByTestId("oracle-sidebar-panel");
    await expect(panel).toBeVisible();

    // 6. Verify workspace resized (should be smaller now)
    const openBox = await canvas.boundingBox();
    const openWidth = openBox?.width || 0;
    expect(openWidth).toBeLessThan(initialWidth);

    // 7. Click to close Oracle
    await sidebarBtn.click();
    await expect(panel).not.toBeVisible();

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
});

import { test, expect } from "@playwright/test";
import { openOracle } from "./test-helpers";

test.describe("Oracle Sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );
      try {
        localStorage.setItem("oracle-hint-seen", "true");
      } catch {
        /* ignore */
      }
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
    const sidebarBtn = page.getByTestId("activity-bar-oracle");
    await expect(sidebarBtn).toBeVisible();

    // 2. Measure initial workspace width (collapsed)
    const canvas = page.getByTestId("graph-canvas");
    await expect(canvas).toBeVisible();
    const initialBox = await canvas.boundingBox();
    expect(initialBox).not.toBeNull();
    const initialWidth = initialBox!.width;

    // 3. Click to open Oracle
    await openOracle(page);

    // 4. Verify panel is visible (the activity-bar button stays mounted as the
    //    persistent activity bar; it is no longer hidden when the panel opens).
    const panel = page.getByTestId("oracle-sidebar-panel");
    await expect(panel).toBeVisible();
    await expect(panel).toHaveCount(1);

    const closeButton = page.getByLabel("Close panel");
    await expect(closeButton).toHaveCount(1);

    // Wait for transition animation
    await page.waitForTimeout(500);

    // 5. Verify panel is docked at the left of the workspace, immediately to the
    //    right of the persistent activity bar.
    const activityBarBox = await page.getByTestId("activity-bar").boundingBox();
    const panelBox = await panel.boundingBox();
    expect(activityBarBox).not.toBeNull();
    expect(panelBox).not.toBeNull();
    expect(panelBox!.x).toBeCloseTo(activityBarBox!.width, 0);

    // 6. Verify workspace resized (should be smaller now)
    const openBox = await canvas.boundingBox();
    expect(openBox).not.toBeNull();
    expect(openBox!.width).toBeLessThan(initialWidth);

    // 7. Close Oracle with the in-panel control. This guards against a hidden
    //    duplicate panel resolving the label to an off-screen button.
    await closeButton.click();
    await expect(panel).not.toBeVisible();
    await expect(sidebarBtn).toBeVisible();

    // 8. Verify workspace returned to full width
    const closedBox = await canvas.boundingBox();
    expect(closedBox).not.toBeNull();
    expect(closedBox!.width).toBeCloseTo(initialWidth, 1);
  });

  test("should persist oracle state across navigation", async ({ page }) => {
    const panel = page.getByTestId("oracle-sidebar-panel");

    // Open Oracle
    await openOracle(page);
    await expect(panel).toBeVisible();

    // Navigate to Map
    await page.getByTestId("activity-bar-map").click();
    await expect(page).toHaveURL(/\/map/);

    // Verify Oracle is STILL open
    await expect(panel).toBeVisible();

    // Navigate back to Graph
    await page.getByTestId("activity-bar-graph").click();
    await expect(page).toHaveURL(/\/$/);
    await expect(panel).toBeVisible();
  });

  // The mobile Oracle entry point differs from the desktop activity bar.
  // At <768px the activity bar collapses to a bottom nav where `activity-bar-oracle`
  // may not be reachable the same way; this needs a rewrite against the current
  // mobile navigation. Deferred under #1168, matching the recovery plan's deferral
  // of the mobile sidebar specs.
  test.fixme("should adapt layout for mobile viewports", async ({ page }) => {
    // Switch to mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const panel = page.getByTestId("oracle-sidebar-panel");

    // Click to open
    await openOracle(page);

    // Verify panel opens as an overlay
    await expect(panel).toBeVisible();
    const panelBox = await panel.boundingBox();
    expect(panelBox?.width).toBeCloseTo(375, 1); // Should span full width
    expect(panelBox?.height).toBeGreaterThan(600); // Should span most of height
  });
});

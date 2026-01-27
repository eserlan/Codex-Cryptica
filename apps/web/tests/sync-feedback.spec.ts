

import { test, expect } from "@playwright/test";

test.describe("Sync Visual Feedback", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Mock local storage to simulate connected state
    await page.evaluate(() => {
      const config = {
        enabled: true,
        connectedEmail: "test@example.com",
        syncInterval: 300000
      };
      localStorage.setItem("cloud-config-store", JSON.stringify(config));
      (window as any).TEST_FORCE_CONFIGURED = true;
    });
    await page.reload();
  });

  test.skip("should show flash effect when sync button is clicked", async ({ page }) => {
    const cloudBtn = page.getByTestId("cloud-status-button");

    // Open menu
    await cloudBtn.click();

    const syncNowBtn = page.getByRole('button', { name: 'SYNC NOW' });
    await expect(syncNowBtn).toBeVisible();

    // Click SYNC NOW and check for flash effect class or animation
    // Note: isFlashing adds a specific class and a child div with animate-ping
    await syncNowBtn.click();

    const flashElement = cloudBtn.locator('.animate-ping');
    await expect(flashElement).toBeVisible(); // Changed from toBeAttached to toBeVisible for better reliability

    // Check if button has the flashing scale/ring classes
    await expect(cloudBtn).toHaveClass(/ring-2/);
    await expect(cloudBtn).toHaveClass(/scale-95/);

    // Wait for flash to end (600ms in code)
    await page.waitForTimeout(800);
    await expect(flashElement).not.toBeVisible();
    await expect(cloudBtn).not.toHaveClass(/ring-2/);
  });

  test.skip("should change icon and animate when syncing", async ({ page }) => {
    const cloudBtn = page.getByTestId("cloud-status-button");
    const statusIcon = cloudBtn.locator('span.text-lg');

    // Manually trigger syncing state in the store via window object
    await page.evaluate(() => {
      // @ts-expect-error - accessing test globals
      const { syncStats } = window;
      if (syncStats) {
        syncStats.setStatus("SYNCING");
      }
    });

    // Check if the icon changes to the syncing state (⚡ and pulse)
    await expect(statusIcon).toHaveText('⚡');
    await expect(statusIcon).toHaveClass(/animate-pulse/);

    // Open menu to check SYNCING text
    await cloudBtn.click();
    const syncNowBtn = page.getByRole('button', { name: 'SYNC NOW' });
    await expect(syncNowBtn).toHaveText(/SYNCING/);
  });
});



import { test, expect } from "@playwright/test";

test.describe("Sync Visual Feedback", () => {
  test.beforeEach(async ({ page }) => {
    // Block Google scripts to prevent overwriting mocks
    await page.route("**/gsi/client", route => route.abort());
    await page.route("**/js/api.js", route => route.abort());

    // Mock gapi for token check and configuration
    await page.addInitScript(() => {
      (window as any).TEST_FORCE_CONFIGURED = true;
      (window as any).gapi = {
        load: (lib: any, cb: any) => cb(),
        client: {
          init: async () => {},
          getToken: () => ({ access_token: "mock-token" }),
          setToken: () => {},
        },
      };
    });

    await page.goto("/");
    // Mock local storage to simulate connected state
    await page.evaluate(() => {
      const config = {
        enabled: true,
        connectedEmail: "test@example.com",
        syncInterval: 300000,
      };
      localStorage.setItem("codex-arcana-cloud-config", JSON.stringify(config));
    });
    await page.reload();
  });

  test("should show flash effect when sync button is clicked", async ({ page }) => {
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

  test("should change icon and animate when syncing", async ({ page }) => {
    const cloudBtn = page.getByTestId("cloud-status-button");
    const statusIcon = cloudBtn.locator('span.text-lg');

    // Manually trigger syncing state in the store via window object
    await page.waitForFunction(() => !!(window as any).syncStats);
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
    // The button text changes to SYNCING..., so looking for "SYNC NOW" will fail
    // We search for a button containing SYNCING inside the menu
    const syncBtn = page.getByTestId('cloud-status-menu').getByRole('button', { name: /SYNCING/ });
    await expect(syncBtn).toBeVisible();
  });
});

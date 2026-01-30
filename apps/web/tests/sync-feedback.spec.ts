import { test, expect } from "@playwright/test";

test.describe("Sync Visual Feedback", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => (window as any).DISABLE_ONBOARDING = true);
    // Block Google scripts to prevent overwriting mocks
    await page.route("**/gsi/client", route => route.abort());
    await page.route("**/js/api.js", route => route.abort());

    // Mock gapi for token check and configuration
    await page.addInitScript(() => {
      (window as any).TEST_FORCE_CONFIGURED = true;
      (window as any).gapi = {
        load: (lib: any, cb: any) => cb(),
        client: {
          init: async () => { },
          getToken: () => ({ access_token: "mock-token" }),
          setToken: () => { },
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
      localStorage.setItem("codex-cryptica-cloud-config", JSON.stringify(config));
    });
    await page.reload();
  });

  test("should show flash effect when sync button is clicked", async ({ page }) => {
    // Open Settings Modal
    await page.getByTestId("settings-button").click();
    // Switch to Cloud Sync tab
    await page.click('[role="tab"]:has-text("Cloud Sync")');

    const syncNowBtn = page.getByRole('button', { name: 'SYNC NOW' });
    await expect(syncNowBtn).toBeVisible();

    // Click SYNC NOW and check for flash effect class or animation
    await syncNowBtn.click();

    // The flash effect adds classes to the button
    await expect(syncNowBtn).toHaveClass(/scale-95/);
    await expect(syncNowBtn).toHaveClass(/ring-2/);

    // Wait for flash to end (500ms in code)
    await page.waitForTimeout(600);
    await expect(syncNowBtn).not.toHaveClass(/ring-2/);
  });

  test("should display SYNCING state when sync is triggered", async ({ page }) => {
    // Open Settings Modal and go to Cloud Sync tab
    await page.getByTestId("settings-button").click();
    await page.click('[role="tab"]:has-text("Cloud Sync")');

    // Manually trigger syncing state in the store via window object
    await page.waitForFunction(() => !!(window as any).syncStats);
    await page.evaluate(() => {
      const { syncStats } = window as any;
      if (syncStats) {
        syncStats.setStatus("SYNCING");
      }
    });

    // The button text changes to SYNCING..., so looking for "SYNC NOW" will fail
    const syncBtn = page.getByTestId('cloud-status-menu').getByRole('button', { name: /SYNCING/ });
    await expect(syncBtn).toBeVisible();
  });
});

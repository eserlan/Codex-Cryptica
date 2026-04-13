import { test, expect } from "@playwright/test";
import { setupVaultPage } from "../test-helpers";

test.describe("Front Page Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  test("header brand restores front page overlay", async ({ page }) => {
    const overlay = page.getByTestId("front-page-overlay");

    // Dismiss the front page so we can test reopening it
    await page.evaluate(() => {
      const uiStore = (window as any).uiStore;
      uiStore.skipWelcomeScreen = true;
      uiStore.dismissedWorldPage = true;
    });

    await expect(overlay).not.toBeVisible();

    // Click the brand button to reopen the front page
    await page.getByTestId("header-front-page-button").click();
    await expect(overlay).toBeVisible({ timeout: 10000 });

    // Reload and verify persistence
    await page.reload();
    await expect(overlay).toBeVisible({ timeout: 10000 });
  });

  test("front page does not show when skipWelcomeScreen is false", async ({
    page,
  }) => {
    const overlay = page.getByTestId("front-page-overlay");

    // Ensure skipWelcomeScreen is false
    await page.evaluate(() => {
      const uiStore = (window as any).uiStore;
      uiStore.skipWelcomeScreen = false;
      uiStore.dismissedWorldPage = false;
    });

    await page.reload();

    // Front page should NOT be visible when skipWelcomeScreen is false
    await expect(overlay).not.toBeVisible({ timeout: 5000 });
  });
});

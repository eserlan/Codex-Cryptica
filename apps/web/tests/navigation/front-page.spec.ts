import { test, expect } from "@playwright/test";
import { setupVaultPage } from "../test-helpers";

test.describe("Front Page Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  test("header brand restores front page overlay", async ({ page }) => {
    const marketingLayer = page.locator(".marketing-layer");
    const overlay = page.getByTestId("front-page-overlay");

    await page.evaluate(() => {
      const uiStore = (window as any).uiStore;
      uiStore.toggleWelcomeScreen(false);
      uiStore.dismissedLandingPage = false;
      uiStore.dismissedWorldPage = false;
      document.documentElement.classList.remove("skip-landing");
      localStorage.removeItem("codex_skip_landing");
    });

    await expect(marketingLayer).toBeVisible({ timeout: 10000 });

    await page.getByTestId("header-front-page-button").click();
    await expect(overlay).toBeVisible({ timeout: 10000 });

    await page.reload();
    await expect(overlay).toBeVisible({ timeout: 10000 });
  });
});

import { test, expect } from "@playwright/test";

test.describe("Front Page Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      try {
        localStorage.setItem("codex_skip_landing", "true");
      } catch {
        /* ignore */
      }
    });

    await page.goto("/");
    // Wait for vault initialization (OPFS auto-load)
    await page.waitForFunction(
      () => {
        const status = (window as any).vault?.status;
        console.log(
          `[E2E Wait] Current vault status: ${status}, isInitialized: ${(window as any).vault?.isInitialized}`,
        );
        return status === "idle";
      },
      {
        timeout: 15000,
      },
    );
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 10000,
    });
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

import { test, expect } from "@playwright/test";

test.describe("Staging Indicator", () => {
  test.beforeEach(async ({ page }) => {
    // Enable E2E access to uiStore
    await page.addInitScript(() => {
      (window as any).__E2E__ = true;
    });
    await page.goto("/");
    await page.waitForFunction(() => (window as any).uiStore !== undefined);
  });

  test("should show indicator when in staging mode", async ({ page }) => {
    // Set staging state via uiStore
    await page.evaluate(() => {
      (window as any).uiStore.isStaging = true;
    });

    const indicator = page.getByTestId("staging-indicator");
    await expect(indicator).toBeVisible();
    await expect(indicator).toContainText("Codex Cryptica");
  });

  test("should not show indicator when not in staging mode", async ({
    page,
  }) => {
    // Ensure staging state is false
    await page.evaluate(() => {
      (window as any).uiStore.isStaging = false;
    });

    const indicator = page.getByTestId("staging-indicator");
    await expect(indicator).not.toBeVisible();

    const title = page.getByTestId("header-title");
    await expect(title).toBeVisible();
  });

  test("should be visible on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.evaluate(() => {
      (window as any).uiStore.isStaging = true;
    });

    const indicator = page.getByTestId("staging-indicator");
    await expect(indicator).toBeVisible();

    // Check it's in the header (near top)
    const box = await indicator.boundingBox();
    expect(box?.y).toBeLessThan(100);
  });
});

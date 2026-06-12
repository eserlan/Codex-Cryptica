import { test, expect } from "@playwright/test";

test.describe("Staging Indicator", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );
    });
    await page.goto("/");
    await page.waitForFunction(() => (window as any).uiStore !== undefined);
  });

  test("should show indicator when in staging mode", async ({ page }) => {
    // Set staging state via uiStore
    await page.evaluate(() => {
      (window as any).codexUI.session.isStaging = true;
    });

    const indicator = page.getByTestId("staging-banner");
    await expect(indicator).toBeVisible();
    await expect(indicator).toContainText("STAGING PREVIEW");
  });

  test("should not show indicator when not in staging mode", async ({
    page,
  }) => {
    // Ensure staging state is false
    await page.evaluate(() => {
      (window as any).codexUI.session.isStaging = false;
    });

    const indicator = page.getByTestId("staging-banner");
    await expect(indicator).not.toBeVisible();

    const title = page.getByTestId("header-title");
    await expect(title).toBeVisible();
  });

  test("should be visible on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.evaluate(() => {
      (window as any).codexUI.session.isStaging = true;
    });

    const indicator = page.getByTestId("staging-banner");
    await expect(indicator).toBeVisible();

    // Check it's in the header (near top)
    const box = await indicator.boundingBox();
    expect(box?.y).toBeLessThan(100);
  });
});

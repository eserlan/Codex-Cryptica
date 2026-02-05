import { test, expect } from "@playwright/test";

test.describe("Mobile Header Responsiveness", () => {
  test("should show mobile logo and optimize header on small screens", async ({ page }) => {
    // Set viewport to a typical mobile width
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Verify "CA" logo is visible and "Codex Cryptica" is hidden
    const mobileLogo = page.locator('span.sm\\:hidden');
    const desktopLogo = page.locator('span.hidden.sm\\:inline');

    await expect(mobileLogo).toBeVisible();
    await expect(mobileLogo).toHaveText('CC');
    await expect(desktopLogo).not.toBeVisible();

    // Verify search button is visible (input is hidden)
    const searchButton = page.getByLabel("Search");
    await expect(searchButton).toBeVisible();
    await expect(page.getByPlaceholder(/Search/)).not.toBeVisible();

    // Verify desktop vault controls are hidden
    const desktopControls = page.locator('header .hidden.md\\:flex');
    await expect(desktopControls).not.toBeVisible();

    // Verify hamburger menu is visible
    await expect(page.getByLabel("Toggle menu")).toBeVisible();
  });

  test("should hide entity labels on small screens", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // The "ENTITIES" label should be hidden (hidden sm:block)
    const entityLabel = page.getByTestId("entity-count");
    // Wait for vault to init if needed, but it should be hidden regardless of count if it has the class
    await expect(entityLabel).not.toBeVisible();
  });
});

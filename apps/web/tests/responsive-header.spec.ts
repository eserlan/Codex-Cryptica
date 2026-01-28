import { test, expect } from "@playwright/test";

test.describe("Mobile Header Responsiveness", () => {
  test("should show mobile logo and wrap header elements on small screens", async ({ page }) => {
    // Set viewport to a typical mobile width
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Verify "CA" logo is visible and "Codex Arcana" is hidden
    const mobileLogo = page.locator('span.sm\\:hidden');
    const desktopLogo = page.locator('span.hidden.sm\\:inline');

    await expect(mobileLogo).toBeVisible();
    await expect(mobileLogo).toHaveText('CA');
    await expect(desktopLogo).not.toBeVisible();

    // Verify search bar is visible
    const searchInput = page.getByPlaceholder(/Search/);
    await expect(searchInput).toBeVisible();

    // Verify vault controls and cloud status are visible
    const vaultControls = page.locator('header').locator('div.flex.items-center.gap-2');
    await expect(vaultControls).toBeVisible();

    // Check for wrapping - the search bar should be in its own "row" (flex-basis 100% via w-full)
    // and below the logo/controls. In Tailwind, order-3 for search, order-2 for controls on mobile.
    const searchBox = page.locator('header > div.w-full');
    const box = await searchBox.boundingBox();
    const logoBox = await page.locator('h1').boundingBox();

    if (box && logoBox) {
      // Search box should be below OR equal to logo position (wrapped layout on mobile)
      expect(box.y).toBeGreaterThanOrEqual(logoBox.y);
    }
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

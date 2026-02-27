import { test, expect } from "@playwright/test";

test.describe("Spatial Canvas", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/canvas");
    // Wait for the redirect/initialization
    await page.waitForURL(/\/canvas\/.+/);
  });

  test("should display the canvas and sidebar", async ({ page }) => {
    await expect(page.locator("text=Primary Workspace")).toBeVisible();
    await expect(page.locator("text=Entity Palette")).toBeVisible();
    await expect(page.locator(".svelte-flow")).toBeVisible();
  });

  test("should allow creating a new canvas", async ({ page }) => {
    // Handle the prompt that appears when creating a new canvas
    await Promise.all([
      page
        .waitForEvent("dialog")
        .then((dialog) => dialog.accept("New Test Canvas")),
      page.click('[title="New Canvas"]'),
    ]);

    // Wait for the new canvas to be active in the URL or sidebar
    await expect(page.locator("text=New Test Canvas")).toBeVisible();
  });
});

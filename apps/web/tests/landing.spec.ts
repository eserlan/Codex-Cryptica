import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("should have a link to the features page", async ({ page }) => {
    await page.goto("/");
    const featuresLink = page.locator('a:has-text("View Features Overview")');
    await expect(featuresLink).toBeVisible();

    // Test navigation
    await featuresLink.click();
    await expect(page).toHaveURL(/.*\/features/);
    await expect(
      page.getByRole("heading", { name: "Core Features" }),
    ).toBeVisible();
  });
});

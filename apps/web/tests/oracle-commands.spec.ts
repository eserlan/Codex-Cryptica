import { test, expect } from "@playwright/test";

test.describe("Oracle Chat Commands", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__SHARED_GEMINI_KEY__ = "fake-key";
    });
    await page.goto("http://localhost:5173/");

    // Open Oracle Window
    const toggleBtn = page.getByTitle("Open Lore Oracle");
    await toggleBtn.click();
  });

  test("Slash Command Menu discovery", async ({ page }) => {
    const input = page.getByTestId("oracle-input");
    await expect(input).toBeVisible();
    await input.click();
    await input.fill("/");

    await expect(page.getByText("FROM", { exact: true })).toBeVisible();

    await expect(page.locator("text=/draw")).toBeVisible();
    await expect(page.locator("text=/create")).toBeVisible();
    await expect(page.locator("text=/connect")).toBeVisible();

    // Test filtering
    await input.type("con");
    await expect(page.locator("text=/draw")).not.toBeVisible();
    await expect(page.locator("text=/connect")).toBeVisible();

    // Test selection
    await page.keyboard.press("Enter");
    await expect(input).toHaveValue("/connect ");
  });

  test("Connection Wizard flow", async ({ page }) => {
    const input = page.getByTestId("oracle-input");
    await expect(input).toBeVisible();
    await input.fill("/connect oracle");
    await page.keyboard.press("Enter");

    await expect(page.locator("text=Connection Wizard")).toBeVisible();
    await expect(
      page.locator("text=1. Select the origin entity"),
    ).toBeVisible();
  });
});

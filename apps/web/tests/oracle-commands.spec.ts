import { test, expect } from "@playwright/test";
import { setupVaultPage, openOracle } from "./test-helpers";

test.describe("Oracle Chat Commands", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
    await openOracle(page);
  });

  test("Slash Command Menu discovery", async ({ page }) => {
    const input = page.getByTestId("oracle-input");
    await expect(input).toBeVisible();
    await input.fill("/");

    await expect(page.getByText("FROM", { exact: true })).toBeVisible();

    await expect(page.locator("text=/draw").first()).toBeVisible();
    await expect(page.locator("text=/create").first()).toBeVisible();
    await expect(page.locator("text=/connect").first()).toBeVisible();

    // Test filtering
    await input.type("con");
    await expect(page.locator("text=/draw").first()).not.toBeVisible();
    await expect(page.locator("text=/connect").first()).toBeVisible();

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

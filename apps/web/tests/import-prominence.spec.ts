import { test, expect } from "@playwright/test";
import { setupVaultPage } from "./test-helpers";

test.describe("Prominent Import Feature", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  test("should have an Import button in Vault Controls that opens a new window", async ({
    page,
    context,
  }) => {
    const vaultMenuBtn = page.getByTestId("vault-actions-menu-button");
    await expect(vaultMenuBtn).toBeVisible({ timeout: 15000 });
    await vaultMenuBtn.click();

    const importMenuItem = page.getByRole("menuitem", { name: /import data/i });
    await expect(importMenuItem).toBeVisible();

    // Listen for the new page being opened
    const pagePromise = context.waitForEvent("page");
    await importMenuItem.click();

    const newPage = await pagePromise;
    await expect(newPage).toHaveTitle(/Archive Importer/i);
    await expect(newPage.locator("h1")).toContainText(/Archive Importer/i);
  });
});

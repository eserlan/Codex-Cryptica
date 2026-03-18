import { test, expect } from "@playwright/test";

test.describe("Prominent Import Feature", () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock state before navigation
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
    });

    await page.goto("/");

    // Ensure we bypass any landing page that still appears
    const enterBtn = page.getByRole("button", { name: /Enter the Codex/i });
    if (await enterBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await enterBtn.click();
    }
  });

  test("should have an Import button in Vault Controls that opens a new window", async ({
    page,
    context,
  }) => {
    const importBtn = page.getByTestId("import-vault-button");
    await expect(importBtn).toBeVisible({ timeout: 15000 });

    // Listen for the new page being opened
    const pagePromise = context.waitForEvent("page");
    await importBtn.click();

    const newPage = await pagePromise;
    await expect(newPage).toHaveTitle(/Archive Importer/i);
    await expect(newPage.locator("h1")).toContainText(/Archive Importer/i);
  });
});

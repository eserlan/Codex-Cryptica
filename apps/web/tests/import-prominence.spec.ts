import { test, expect } from "@playwright/test";

test.describe("Prominent Import Feature", () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock state before navigation
    await page.addInitScript(() => {
      try {
        localStorage.setItem("codex_skip_landing", "true");
      } catch {
        /* ignore */
      }
    });

    await page.goto("/");

    // Ensure we bypass any landing page that still appears
    await page
      .evaluate(() => {
        const uiStore = (window as any).uiStore;
        if (uiStore) uiStore.dismissedLandingPage = true;
      })
      .catch(() => {});
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

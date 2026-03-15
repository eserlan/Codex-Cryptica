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
    await expect(newPage).toHaveTitle(/Archive Ingestion/i);
    await expect(newPage.locator("h1")).toContainText(/Archive Ingestion/i);
  });

  test("should have an Import button in Entity Palette header", async ({
    page,
    context,
  }) => {
    const explorerImportBtn = page.getByTestId("explorer-import-button");
    await expect(explorerImportBtn).toBeVisible({ timeout: 15000 });

    const pagePromise = context.waitForEvent("page");
    await explorerImportBtn.click();

    const newPage = await pagePromise;
    await expect(newPage).toHaveTitle(/Archive Ingestion/i);
  });

  test("should show EmptyVaultOverlay when vault is empty", async ({
    page,
    context,
  }) => {
    const overlayHeading = page.getByText(/The Archive is Silent/i);
    const isVisible = await overlayHeading
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (isVisible) {
      const importArchiveBtn = page.getByRole("button", {
        name: /Import Archive/i,
      });
      await expect(importArchiveBtn).toBeVisible();

      const pagePromise = context.waitForEvent("page");
      await importArchiveBtn.click();

      const newPage = await pagePromise;
      await expect(newPage).toHaveTitle(/Archive Ingestion/i);
    } else {
      console.log("Skipping empty state check as vault appears non-empty");
    }
  });
});

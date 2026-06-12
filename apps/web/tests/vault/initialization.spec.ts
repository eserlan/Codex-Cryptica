import { test, expect } from "@playwright/test";
import { setupVaultPage } from "../test-helpers";

test.describe("Vault Initialization", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  test("auto-initializes default vault", async ({ page }) => {
    await expect(page.getByTitle("Switch Vault")).toContainText(
      /Default Vault|Local Vault/,
    );
    // Should show empty vault status (0 notes)
    await expect(
      page
        .locator("[aria-live='polite'], [role='status']")
        .filter({ hasText: /0 (NOTES|CHRONICLES)/i }),
    ).toBeVisible();
  });
});

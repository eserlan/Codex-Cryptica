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
    // Should be empty initially — when 0 entities, the UI shows "NO ARCHIVE" instead of entity-count
    await expect(page.getByText("NO ARCHIVE")).toBeVisible();
  });
});

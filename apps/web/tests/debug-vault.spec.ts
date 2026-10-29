import { test, expect } from "@playwright/test";
import { setupVaultPage } from "./test-helpers";

test.describe("Vault Management Debug", () => {
  test.beforeEach(async ({ page }) => {
    // Add console listener
    page.on("console", (msg) => console.log(`[BROWSER]: ${msg.text()}`));

    await setupVaultPage(page);
  });

  test("should create and switch a vault", async ({ page }) => {
    // 1. Create temporary vault
    await page.getByTestId("open-vault-button").click();
    await page.getByRole("button", { name: "NEW VAULT" }).click();
    const vaultName = `Temp-${Date.now()}`;
    await page.getByPlaceholder("Vault Name...").fill(vaultName);
    await page.getByRole("button", { name: "CREATE" }).click();

    console.log(`[TEST] Expecting vault name: ${vaultName}`);
    await expect(page.getByTestId("open-vault-button")).toContainText(
      vaultName,
    );
  });
});

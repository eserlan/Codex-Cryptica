import { test, expect } from "@playwright/test";

test.describe("Vault Management Debug", () => {
  test.beforeEach(async ({ page }) => {
    // Add console listener
    page.on("console", (msg) => console.log(`[BROWSER]: ${msg.text()}`));

    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
    });
    await page.goto("/");
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should create and switch a vault", async ({ page }) => {
    // 1. Create temporary vault
    await page.getByTitle("Switch Vault").click();
    await page.getByRole("button", { name: "NEW VAULT" }).click();
    const vaultName = `Temp-${Date.now()}`;
    await page.getByPlaceholder("Vault Name...").fill(vaultName);
    await page.getByRole("button", { name: "CREATE" }).click();

    console.log(`[TEST] Expecting vault name: ${vaultName}`);
    await expect(page.getByTitle("Switch Vault")).toContainText(vaultName);
  });
});

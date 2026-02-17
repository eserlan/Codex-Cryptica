import { test, expect } from "@playwright/test";

test.describe("Import Progress Management E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).DISABLE_ERROR_OVERLAY = true;
    });

    await page.goto("http://localhost:5173/");
    await page.waitForFunction(() => (window as any).uiStore !== undefined);
  });

  test("should show the import section in vault settings", async ({ page }) => {
    // 1. Open Settings
    await page.getByTestId("settings-button").click();

    // 2. Go to Vault Tab
    await page.getByRole("tab", { name: "Vault" }).click();

    // 3. Verify Archive Ingestion section
    await expect(
      page.getByRole("heading", { name: /archive ingestion/i }),
    ).toBeVisible();

    // 4. Verify Dropzone presence
    await expect(
      page.getByText(/drag files here or paste content/i),
    ).toBeVisible();
  });
});

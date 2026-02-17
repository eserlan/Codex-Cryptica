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

  test("should import a file and update progress indicators", async ({
    page,
  }) => {
    // 1. Open Settings
    await page.getByTestId("settings-button").click();

    // 2. Go to Vault Tab
    await page.getByRole("tab", { name: "Vault" }).click();

    // 3. Upload an archive file
    const fileInput = page.locator("#file-input");
    await fileInput.setInputFiles("apps/web/tests/fixtures/sample-import.json");

    // 4. Verify that import progress indicators appear
    // We expect the "Analyzing" text to appear
    await expect(page.getByText(/analyzing/i)).toBeVisible();
    await expect(page.locator(".animate-spin")).toBeVisible();
  });

  test("should resume import progress after page reload", async ({ page }) => {
    // 1. Open Settings
    await page.getByTestId("settings-button").click();

    // 2. Go to Vault Tab
    await page.getByRole("tab", { name: "Vault" }).click();

    // 3. Start an import
    const fileInput = page.locator("#file-input");
    await fileInput.setInputFiles("apps/web/tests/fixtures/sample-import.json");
    await expect(page.getByText(/analyzing/i)).toBeVisible();

    // 4. Simulate a user refreshing the page
    await page.reload();
    await page.waitForFunction(() => (window as any).uiStore !== undefined);

    // 5. Navigate back to the Vault settings tab
    await page.getByTestId("settings-button").click();
    await page.getByRole("tab", { name: "Vault" }).click();

    // 6. Verify that "Already processed" or progress is remembered
    // If it was small, it might already be done.
    // Given the resume logic, it should show either the progress bar or the resume toast
    // for identical files.
    await expect(page.getByText(/already processed|resuming/i)).toBeVisible();
  });
});

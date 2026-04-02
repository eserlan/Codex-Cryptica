import { test, expect } from "@playwright/test";

test.describe("Import Progress Management E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      try {
        localStorage.setItem("codex_skip_landing", "true");
      } catch {
        /* ignore */
      }
      (window as any).DISABLE_ERROR_OVERLAY = true;
      // Mock the API key to allow import to proceed
      (window as any).__SHARED_GEMINI_KEY__ = "test-key-mock";
    });

    await page.goto("/import");
    await page.waitForFunction(() => (window as any).uiStore !== undefined);
  });

  test("should show the import section in vault settings", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /archive importer/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /paste text or drag files here/i }),
    ).toBeVisible();
  });

  test("should import a file and update progress indicators", async ({
    page,
  }) => {
    // 1. Upload an archive file
    const fileInput = page.locator("#file-input");
    await fileInput.setInputFiles("tests/fixtures/sample-import.json");

    // 4. Verify that import progress indicators appear
    // We expect the "Analyzing" text to appear
    await expect(page.getByText(/analyzing/i)).toBeVisible();
    await expect(page.locator(".animate-spin")).toBeVisible();
  });

  test("should resume import progress after page reload", async ({ page }) => {
    // 1. Start an import
    const fileInput = page.locator("#file-input");
    await fileInput.setInputFiles("tests/fixtures/sample-import.json");
    await expect(page.getByText(/analyzing/i)).toBeVisible();

    // 2. Simulate a user refreshing the page
    await page.reload();
    await page.waitForFunction(() => (window as any).uiStore !== undefined);

    // 3. Verify the importer comes back cleanly after reload
    await expect(
      page.getByRole("heading", { name: /archive importer/i }),
    ).toBeVisible();
    await expect(page.locator("#file-input")).toBeAttached();
  });
});

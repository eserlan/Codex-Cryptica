import { test, expect } from "@playwright/test";

test.describe("Settings Modal", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).localStorage.setItem("codex_skip_landing", "true");
    });
    await page.goto("/");
    // Wait for app to be ready
    await page.waitForFunction(() => (window as any).uiStore !== undefined);
  });

  test("should open settings modal and switch tabs", async ({ page }) => {
    // 1. Click settings button in header
    const settingsBtn = page.getByTestId("settings-button");
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    // 2. Verify modal is visible - find by heading
    // The h2 at the top of SettingsModal reflects the active tab label
    await expect(page.locator("h2", { hasText: "Vault" })).toBeVisible();

    // 3. Switch to Intelligence tab
    await page.click('[role="tab"]:has-text("AI")');
    // Tab header should change to AI
    await expect(page.locator("h2", { hasText: "AI" })).toBeVisible();
    // Content should show the Oracle heading (now an h3)
    await expect(
      page.locator("h3", { hasText: "Lore Oracle (Gemini AI)" }),
    ).toBeVisible();

    // 4. Switch to Schema tab
    await page.click('[role="tab"]:has-text("Schema")');
    await expect(page.locator("h2", { hasText: "Schema" })).toBeVisible();
    await expect(
      page.locator("text=Define the ontology of your world"),
    ).toBeVisible();

    // 5. Switch to About tab
    await page.click('[role="tab"]:has-text("About")');
    await expect(page.locator("h2", { hasText: "About" })).toBeVisible();
    await expect(page.locator("text=Manifest")).toBeVisible();

    // 6. Close modal
    await page.click('button[aria-label="Close Settings"]');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test("should function correctly in offline mode", async ({
    page,
    context,
  }) => {
    // 1. Go offline
    await context.setOffline(true);

    // 2. Open settings
    await page.getByTestId("settings-button").click();
    await expect(page.locator("h2", { hasText: "Vault" })).toBeVisible();

    // 3. Switch tabs
    await page.click('[role="tab"]:has-text("AI")');
    await expect(page.locator("h2", { hasText: "AI" })).toBeVisible();
    await expect(
      page.locator("h3", { hasText: "Lore Oracle (Gemini AI)" }),
    ).toBeVisible();

    // 4. Go back online
    await context.setOffline(false);
  });
});

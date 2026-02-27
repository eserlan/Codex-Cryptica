import { test, expect } from "@playwright/test";

test.describe("Cloud Sync UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      localStorage.setItem("codex_skip_landing", "true");
    });
    await page.goto("/");
    await page.waitForFunction(() => (window as any).uiStore !== undefined);
    await page.waitForFunction(() => (window as any).vault?.status === "idle");
  });

  test("should open and close the cloud sync menu", async ({ page }) => {
    const settingsBtn = page.getByTestId("settings-button");
    const syncTabPanel = page.locator("#settings-panel-sync");

    // 1. Initially sync panel should not be visible (modal closed)
    await expect(syncTabPanel).not.toBeVisible();

    // 2. Click gear icon to open settings
    await settingsBtn.click();

    // 3. Switch to Sync tab
    await page.click("#settings-tab-sync");
    await expect(syncTabPanel).toBeVisible();

    // 4. Close the modal using the close button
    await page.click('button[aria-label="Close Settings"]');
    await expect(syncTabPanel).not.toBeVisible();
  });

  test("should not close when clicking inside the panel", async ({ page }) => {
    const settingsBtn = page.getByTestId("settings-button");
    const syncTabPanel = page.locator("#settings-panel-sync");

    await settingsBtn.click();
    await page.click("#settings-tab-sync");
    await expect(syncTabPanel).toBeVisible();

    // Click inside the menu area (on an element inside the panel)
    // The GDriveConnect component renders a title
    await syncTabPanel
      .getByRole("heading", { name: "Google Drive Cloud Sync" })
      .click();
    await expect(syncTabPanel).toBeVisible();
  });

  test("should close when clicking the backdrop", async ({ page }) => {
    const settingsBtn = page.getByTestId("settings-button");
    const dialog = page.locator('[role="dialog"]');

    await settingsBtn.click();
    await page.click("#settings-tab-sync");
    await expect(dialog).toBeVisible();

    // Click on the backdrop (role="presentation") to close
    // We force click at 10,10 which should be the overlay
    await page
      .locator('[role="presentation"]')
      .click({ position: { x: 10, y: 10 }, force: true });
    await expect(dialog).not.toBeVisible();
  });
});

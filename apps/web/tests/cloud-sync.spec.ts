import { test, expect } from "@playwright/test";

test.describe("Cloud Sync UI", () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => (window as any).DISABLE_ONBOARDING = true);
        await page.goto("/");
    });

    test("should open and close the cloud sync menu", async ({ page }) => {
        const settingsBtn = page.getByTestId("settings-button");
        const menu = page.getByTestId("cloud-status-menu");

        // 1. Initially menu should not be visible
        await expect(menu).not.toBeVisible();

        // 2. Click gear icon to open settings
        await settingsBtn.click();

        // 3. Switch to Sync tab
        await page.click('[role="tab"]:has-text("Cloud Sync")');
        await expect(menu).toBeVisible();

        // 4. Close the modal using the close button
        await page.click('button[aria-label="Close Settings"]');
        await expect(menu).not.toBeVisible();
    });

    test("should not close when clicking inside the menu", async ({ page }) => {
        const settingsBtn = page.getByTestId("settings-button");
        const menu = page.getByTestId("cloud-status-menu");

        await settingsBtn.click();
        await page.click('[role="tab"]:has-text("Cloud Sync")');
        await expect(menu).toBeVisible();

        // Click inside the menu area (on an element inside the panel)
        // The Account span only appears when connected, so let's click on a guaranteed element
        await page.click('[role="tabpanel"]');
        await expect(menu).toBeVisible();
    });

    test("should close when clicking the backdrop", async ({ page }) => {
        const settingsBtn = page.getByTestId("settings-button");
        const dialog = page.locator('[role="dialog"]');

        await settingsBtn.click();
        await page.click('[role="tab"]:has-text("Cloud Sync")');
        await expect(dialog).toBeVisible();

        // Click on the backdrop (role="presentation") to close
        await page.locator('[role="presentation"]').click({ position: { x: 10, y: 10 } });
        await expect(dialog).not.toBeVisible();
    });
});

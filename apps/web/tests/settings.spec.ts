import { test, expect } from "@playwright/test";

test.describe("Settings Modal", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        // Wait for app to be ready
        await page.waitForFunction(() => (window as any).uiStore !== undefined);
    });

    test("should open settings modal and switch tabs", async ({ page }) => {
        // 1. Click settings button in header
        const settingsBtn = page.locator('button[title="Application Settings"]');
        await expect(settingsBtn).toBeVisible();
        await settingsBtn.click();

        // 2. Verify modal is visible - find by heading
        // Wait for selector to be present in DOM and visible
        await page.waitForSelector('h2:has-text("Vault")', { state: 'visible', timeout: 5000 });
        const vaultHeading = page.locator('h2', { hasText: 'Vault' });
        await expect(vaultHeading).toBeVisible();

        // 3. Switch to Intelligence tab
        await page.click('nav button:has-text("Intelligence")');
        await expect(page.locator('h2', { hasText: 'Intelligence' })).toBeVisible();
        await expect(page.locator('text=Lore Oracle (Gemini AI)')).toBeVisible();

        // 4. Switch to Schema tab
        await page.click('nav button:has-text("Schema")');
        await expect(page.locator('h2', { hasText: 'Schema' })).toBeVisible();
        await expect(page.locator('text=Define the ontology of your world')).toBeVisible();

        // 5. Switch to About tab
        await page.click('nav button:has-text("About")');
        await expect(page.locator('h2', { hasText: 'About' })).toBeVisible();
        await expect(page.locator('text=Manifest')).toBeVisible();

        // 6. Close modal
        await page.click('button[aria-label="Close Settings"]');
        await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    });

    test("should open directly to sync tab from cloud button", async ({ page }) => {
        const cloudBtn = page.locator('button[data-testid="cloud-status-button"]');
        await expect(cloudBtn).toBeVisible();
        await cloudBtn.click();
        await page.waitForSelector('h2:has-text("Cloud Sync")', { state: 'visible' });
        await expect(page.locator('h2', { hasText: 'Cloud Sync' })).toBeVisible();
    });

    test("should function correctly in offline mode", async ({ page, context }) => {
        // 1. Go offline
        await context.setOffline(true);
        
        // 2. Open settings
        await page.click('button[title="Application Settings"]');
        await expect(page.locator('h2', { hasText: 'Vault' })).toBeVisible();

        // 3. Switch tabs
        await page.click('nav button:has-text("Intelligence")');
        await expect(page.locator('h2', { hasText: 'Intelligence' })).toBeVisible();

        // 4. Go back online
        await context.setOffline(false);
    });
});

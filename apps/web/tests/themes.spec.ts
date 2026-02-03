import { test, expect } from '@playwright/test';

test.describe('Visual Styling Templates', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            (window as any).DISABLE_ONBOARDING = true;
        });
        await page.goto('http://localhost:5173/');
        // Open a vault to enable settings
        await page.getByRole('button', { name: 'OPEN VAULT' }).click();
    });

    test('Switch to Fantasy theme and verify visual changes', async ({ page }) => {
        // 1. Open Settings
        await page.getByTestId('settings-button').click();
        
        // 2. Go to Aesthetics tab
        await page.getByRole('tab', { name: 'Aesthetics' }).click();

        // 3. Select Fantasy theme
        await page.getByRole('button', { name: 'Ancient Parchment' }).click();

        // 4. Verify background color change (Parchment color)
        const body = page.locator('body');
        await expect(body).toHaveCSS('background-color', 'rgb(253, 246, 227)');
    });

    test('Switch to Blood & Noir theme and verify visual changes', async ({ page }) => {
        // 1. Open Settings
        await page.getByTestId('settings-button').click();
        
        // 2. Go to Aesthetics tab
        await page.getByRole('tab', { name: 'Aesthetics' }).click();

        // 3. Select Horror theme
        await page.getByRole('button', { name: 'Blood & Noir' }).click();

        // 4. Verify visual properties
        const body = page.locator('body');
        await expect(body).toHaveCSS('background-color', 'rgb(5, 5, 5)');
        
        // 5. Verify primary color (Deep Crimson) is correctly applied to CSS variable
        const primaryColor = await page.evaluate(() => 
            getComputedStyle(document.documentElement).getPropertyValue('--color-accent-primary').trim()
        );
        expect(primaryColor).toBe('#991b1b');
    });

    test('Theme selection persists across reloads', async ({ page }) => {
        await page.getByTestId('settings-button').click();
        await page.getByRole('tab', { name: 'Aesthetics' }).click();
        await page.getByRole('button', { name: 'Neon Night' }).click();
        
        // Verify cyberpunk color
        let primary = await page.evaluate(() => 
            getComputedStyle(document.documentElement).getPropertyValue('--color-accent-primary').trim()
        );
        expect(primary).toBe('#f472b6');

        // Reload page
        await page.reload();
        
        // Wait for theme to be applied
        await page.waitForFunction(() => 
            getComputedStyle(document.documentElement).getPropertyValue('--color-accent-primary').trim() !== ""
        );

        // Verify it persisted
        primary = await page.evaluate(() => 
            getComputedStyle(document.documentElement).getPropertyValue('--color-accent-primary').trim()
        );
        expect(primary).toBe('#f472b6');
    });
});

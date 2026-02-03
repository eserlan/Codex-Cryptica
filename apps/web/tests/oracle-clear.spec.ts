
import { test, expect } from '@playwright/test';

test.describe('Oracle Clear Chat', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            (window as any).DISABLE_ONBOARDING = true;
        });
        await page.goto('/');
        
        // Enable Oracle by adding a dummy API key
        await page.evaluate(async () => {
            if ((window as any).oracle) {
                (window as any).oracle.apiKey = 'fake-key';
            }
        });
    });

    test('should show clear chat button only when messages exist and clear history on click', async ({ page }) => {
        // 1. Open Oracle Window
        const toggleBtn = page.getByTitle('Open Lore Oracle');
        await expect(toggleBtn).toBeVisible();
        await toggleBtn.click();

        // 2. Initially, no clear button (no messages)
        const clearBtn = page.getByTitle('Clear conversation history');
        await expect(clearBtn).not.toBeVisible();

        // 3. Send a message
        const textarea = page.getByTestId('oracle-input');
        await textarea.fill('Hello Oracle');
        await page.keyboard.press('Enter');

        // 4. Clear button should appear
        await expect(clearBtn).toBeVisible();

        // 5. Click clear and confirm
        page.on('dialog', dialog => dialog.accept());
        await clearBtn.click();

        // 6. Messages should be gone and clear button hidden
        await expect(page.getByText('Hello Oracle')).not.toBeVisible();
        await expect(clearBtn).not.toBeVisible();
        await expect(page.getByText('The Archives are Open')).toBeVisible();
    });
});

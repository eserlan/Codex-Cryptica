import { test } from '@playwright/test';

test('Open Vault button calls showDirectoryPicker', async ({ page }) => {
    // Mock window.showDirectoryPicker
    await page.addInitScript(() => {
        // @ts-expect-error - Mock browser API
        window.showDirectoryPicker = async () => {
            console.log('MOCK: showDirectoryPicker called');
            return {
                kind: 'directory',
                name: 'test-vault',
                requestPermission: async () => 'granted',
                queryPermission: async () => 'granted',
                values: () => [],
                getFileHandle: async () => ({
                    kind: 'file',
                    name: 'test.md',
                    getFile: async () => new File([''], 'test.md')
                })
            };
        };
    });

    await page.goto('/');

    // Check for console log to verify mock call
    const consolePromise = page.waitForEvent('console', msg => msg.text() === 'MOCK: showDirectoryPicker called');

    await page.getByRole('button', { name: 'Open Vault' }).click();

    await consolePromise;

    // Also verify UI change if possible, but the mock is the critical part for the user's request
    // expect(await page.getByText('test-vault').isVisible()).toBe(true);
});

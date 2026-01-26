import { test, expect } from '@playwright/test';

test.describe('Fuzzy Search', () => {
    test.beforeEach(async ({ page }) => {
        // Mock File System Access API
        await page.addInitScript(() => {
            const content = `---
title: My Note
---
# My Note Content`;
            const mockFile = new File([content], 'My Note.md', { type: 'text/markdown' });

            const fileHandle = {
                kind: 'file',
                name: 'My Note.md',
                getFile: async () => mockFile,
                createWritable: async () => ({
                    write: async () => { },
                    close: async () => { },
                })
            };

            const dirHandle = {
                kind: 'directory',
                name: 'test-vault',
                requestPermission: async () => 'granted',
                queryPermission: async () => 'granted',
                values: async function* () {
                    yield fileHandle;
                },
                entries: async function* () {
                    yield ['My Note.md', fileHandle];
                },
                getFileHandle: async () => fileHandle
            };

            // @ts-expect-error - Mock
            window.showDirectoryPicker = async () => {
                return dirHandle;
            };
        });
    });

    test('Search works offline', async ({ page, context }) => {
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        await page.goto('/');

        // 1. Open Vault to trigger indexing
        await page.getByRole('button', { name: 'Open Vault' }).click();

        // Wait for indexing to complete by checking entity count
        await expect(page.getByText('1 ENTITIES')).toBeVisible({ timeout: 10000 });

        // 2. Go Offline
        await context.setOffline(true);

        // 3. Open Search Modal (Cmd+K)
        await page.keyboard.press('Meta+k');
        if (process.platform !== 'darwin') {
            await page.keyboard.press('Control+k');
        }

        const input = page.getByPlaceholder('Search notes...');
        await expect(input).toBeVisible();

        // 4. Type query
        await input.fill('Note');

        // 5. Verify results
        // Should find "My Note"
        await expect(page.getByText('My Note', { exact: true })).toBeVisible();

        // 6. Verify navigation (selection)
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');

        await expect(input).not.toBeVisible();

        // 7. Verify Detail Panel opens
        const detailPanel = page.getByRole('button', { name: 'Close panel' });
        await expect(detailPanel).toBeVisible();

        // Verify it's the right entity
        await expect(page.locator('h2', { hasText: 'My Note' })).toBeVisible();

        // 8. Verify URL change 
        await page.waitForURL(/.*\?file=.*My.*Note.*/);
    });
});

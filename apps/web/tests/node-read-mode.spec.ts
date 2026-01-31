import { test, expect } from '@playwright/test';

test.describe('Node Read Mode', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            (window as any).DISABLE_ONBOARDING = true;
            // Mock IDB
            const originalPut = IDBObjectStore.prototype.put;
            IDBObjectStore.prototype.put = function (...args: [unknown, IDBValidKey?]) {
                try { return originalPut.apply(this, args); } catch { return {} as any; }
            };

            const content1 = "---\nid: hero\ntitle: Hero\nconnections:\n  - target: villain\n    type: enemy\n---\n# Hero Content\nHero is bold.";
            const content2 = "---\nid: villain\ntitle: Villain\n---\n# Villain Content\nVillain is bad.";

            const createMockFile = (content: string, name: string) => ({
                kind: 'file',
                name,
                getFile: async () => new File([content], name, { type: 'text/markdown' }),
                createWritable: async () => ({ write: async () => { }, close: async () => { } })
            });

            const f1 = createMockFile(content1, 'hero.md');
            const f2 = createMockFile(content2, 'villain.md');

            // @ts-expect-error - Mock
            window.showDirectoryPicker = async () => ({
                kind: 'directory',
                requestPermission: async () => 'granted',
                queryPermission: async () => 'granted',
                values: () => [f1, f2][Symbol.iterator](),
                entries: () => [['hero.md', f1], ['villain.md', f2]][Symbol.iterator](),
                getFileHandle: async (n: string) => n === 'hero.md' ? f1 : f2
            });
        });
    });

    test('Open Read Mode, Copy, Navigate, and Close', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.getByRole('button', { name: 'OPEN VAULT' }).click();
        await expect(page.getByTestId('entity-count')).toHaveText('2 ENTITIES', { timeout: 20000 });

        // 1. Open "Hero" detail panel via Search (or just clicking graph if we could, but search is easier)
        await page.keyboard.press('Control+k');
        await page.getByPlaceholder('Search notes...').fill('Hero');
        await page.getByTestId('search-result').filter({ hasText: 'Hero' }).click();

        // Wait for panel
        await expect(page.getByRole('heading', { level: 2 }).filter({ hasText: 'Hero' })).toBeVisible();

        // 2. Click "Read Mode" button (book icon)
        await page.getByTitle('Zen Mode (Full Screen)').click();

        // 3. Verify Modal Open
        const modal = page.locator('[role="dialog"]');

        // 4. Verify Copy (Mock Clipboard)
        await page.context().grantPermissions(['clipboard-write']);
        await modal.getByTitle('Copy Content').click();
        // Verify visual feedback (icon change)
        await expect(modal.locator('.icon-\\[lucide--check\\]')).toBeVisible();

        // 5. Navigate
        // Hero has connection to Villain. Find the connection link.
        await modal.getByText('Villain').click();

        // 6. Verify Content Updates
        await expect(modal.getByText('Villain Content')).toBeVisible();

        await expect(modal.getByTestId('entity-title')).toHaveText('Villain');
        await expect(modal.getByTestId('entity-title')).toBeVisible();

        // 7. Close
        await modal.getByLabel('Close').click();
        await expect(modal).not.toBeVisible();
    });

    test('Open Zen Mode via Keyboard Shortcut (Alt+Z)', async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.getByRole('button', { name: 'OPEN VAULT' }).click();
        await expect(page.getByTestId('entity-count')).toHaveText('2 ENTITIES', { timeout: 20000 });

        // 1. Select "Hero" (opens detail panel)
        await page.keyboard.press('Control+k');
        await page.getByPlaceholder('Search notes...').fill('Hero');
        await page.getByTestId('search-result').filter({ hasText: 'Hero' }).click();
        await expect(page.getByRole('heading', { level: 2 }).filter({ hasText: 'Hero' })).toBeVisible();

        // 2. Press Alt+Z
        await page.keyboard.press('Alt+z');

        // 3. Verify Modal Open
        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible();
        await expect(modal.getByTestId('entity-title')).toHaveText('Hero');
    });
});

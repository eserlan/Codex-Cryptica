import { test, expect } from '@playwright/test';

test.describe('Fuzzy Search', () => {
    test.beforeEach(async ({ page }) => {
        // Mock File System Access API and IndexedDB
        await page.addInitScript(() => {
            // Intercept IndexedDB to handle DataCloneError with mock handles
            const originalPut = IDBObjectStore.prototype.put;
            IDBObjectStore.prototype.put = function (...args: [unknown, IDBValidKey?]) {
                try {
                    return originalPut.apply(this, args);
                } catch (e: any) {
                    if (e.name === 'DataCloneError') {
                        console.log("MOCK: Caught DataCloneError in IndexedDB, returning fake success");
                        const req: any = {
                            onsuccess: null,
                            onerror: null,
                            result: args[1],
                            readyState: 'done',
                            addEventListener: function (type: string, listener: any) {
                                if (type === 'success') this.onsuccess = listener;
                            }
                        };
                        setTimeout(() => {
                            if (req.onsuccess) req.onsuccess({ target: req });
                        }, 0);
                        return req;
                    }
                    throw e;
                }
            };

            const content1 = "---\ntitle: My Note\n---\n# My Note Content";
            const content2 = "---\ntitle: The Crone\n---\n# The Crone Content";

            const createMockFile = (content: string, name: string) => {
                const file = new File([content], name, { type: 'text/markdown' });
                return {
                    kind: 'file',
                    name,
                    getFile: async () => file,
                    createWritable: async () => ({
                        write: async () => { },
                        close: async () => { }
                    })
                };
            };

            const fileHandle1 = createMockFile(content1, 'My Note.md');
            const fileHandle2 = createMockFile(content2, 'the-crone.md');

            const dirHandle = {
                kind: 'directory',
                name: 'test-vault',
                requestPermission: async () => 'granted',
                queryPermission: async () => 'granted',
                values: function () {
                    return [fileHandle1, fileHandle2][Symbol.iterator]();
                },
                entries: function () {
                    const entries = [['My Note.md', fileHandle1], ['the-crone.md', fileHandle2]];
                    return {
                        [Symbol.asyncIterator]() {
                            let i = 0;
                            return {
                                async next() {
                                    if (i < entries.length) {
                                        return { value: entries[i++], done: false };
                                    }
                                    return { done: true };
                                }
                            };
                        }
                    };
                },
                getFileHandle: async (name: string) => name === 'My Note.md' ? fileHandle1 : fileHandle2
            };

            // @ts-expect-error - Mock
            window.showDirectoryPicker = async () => dirHandle;
        });
    });

    test('Search works offline', async ({ page, context }) => {
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        await page.goto('/');

        // 1. Open Vault to trigger indexing
        await page.getByRole('button', { name: 'OPEN VAULT' }).click();

        // Wait for indexing to complete (2 entries)
        await expect(page.getByTestId('entity-count')).toHaveText('2 ENTITIES', { timeout: 20000 });

        // 2. Go Offline
        await context.setOffline(true);

        // 3. Open Search Modal
        await page.keyboard.press('Control+k');
        await page.keyboard.press('Meta+k');

        const input = page.getByPlaceholder('Search notes...');
        await expect(input).toBeVisible();

        // 4. Type query
        await input.fill('Note');

        // 5. Verify results
        await expect(page.getByTestId('search-result').filter({ hasText: 'My Note' })).toBeVisible();

        // 6. Click the result directly
        await page.getByTestId('search-result').filter({ hasText: 'My Note' }).click();

        await expect(input).not.toBeVisible({ timeout: 2000 });

        // 7. Verify Detail Panel opens
        await expect(page.getByRole('heading', { level: 2 }).filter({ hasText: 'My Note' })).toBeVisible();
    });

    test('handles search results with missing IDs via path fallback', async ({ page }) => {
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        await page.goto('/');

        // 1. Open Vault to trigger initial UI state
        await page.getByRole('button', { name: 'OPEN VAULT' }).click();
        await expect(page.getByTestId('entity-count')).toHaveText('2 ENTITIES', { timeout: 20000 });

        // 2. Mock broken search results
        await page.evaluate(() => {
            const mockResults = [
                {
                    id: undefined, // MISSING ID
                    title: 'The Crone',
                    path: 'the-crone.md',
                    matchType: 'content',
                    score: 0.9,
                    excerpt: 'The Crone is a mysterious figure...'
                }
            ];

            const { searchStore } = window as any;
            if (searchStore) {
                searchStore.update((s: any) => ({
                    ...s,
                    query: 'Crone',
                    results: mockResults,
                    isOpen: true
                }));
            }
        });

        // 3. Verify the "broken" result is visible
        const resultItem = page.getByTestId('search-result').filter({ hasText: 'The Crone' });
        await expect(resultItem).toBeVisible();

        // 4. Select the result
        await resultItem.click();

        // 5. Verify Fallback worked
        await expect(page.getByPlaceholder('Search notes...')).not.toBeVisible();

        // Check for the title in the detail panel
        await expect(page.getByRole('heading', { level: 2 }).filter({ hasText: /Crone/i })).toBeVisible();
    });
});

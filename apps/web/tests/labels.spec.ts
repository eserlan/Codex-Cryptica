import { test, expect } from '@playwright/test';

test.describe('Entity Labeling System', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            (window as any).DISABLE_ONBOARDING = true;
            (window as any).__E2E__ = true;
            (window as any).showDirectoryPicker = async () => {
                console.log('PLAYWRIGHT_MOCK: showDirectoryPicker called');
                return {
                    kind: 'directory',
                    name: 'test-vault',
                    getFileHandle: async (name: string) => {
                        console.log('PLAYWRIGHT_MOCK: getFileHandle called for', name);
                        return {
                            kind: 'file',
                            name: name,
                            getFile: async () => ({
                                lastModified: Date.now(),
                                text: async () => '---\ntitle: Test\n---'
                            }),
                            createWritable: async () => ({
                                write: async () => {},
                                close: async () => {}
                            })
                        };
                    },
                    getDirectoryHandle: async () => {
                        throw new Error('Not implemented');
                    },
                    values: async function* () { yield* []; }
                };
            };

            // Patch IDBObjectStore.put to avoid DataCloneError when persisting mocked handles
            if (typeof IDBObjectStore !== 'undefined' && IDBObjectStore.prototype && typeof IDBObjectStore.prototype.put === 'function') {
                const originalPut = IDBObjectStore.prototype.put;
                IDBObjectStore.prototype.put = function (value: any, key?: IDBValidKey) {
                    try {
                        return originalPut.call(this, value, key);
                    } catch (err) {
                        // Strip functions from the value so it becomes cloneable for IndexedDB
                        if (value && typeof value === 'object') {
                            const clone: any = {};
                            for (const [k, v] of Object.entries(value)) {
                                if (typeof v !== 'function') {
                                    clone[k] = v;
                                }
                            }
                            return originalPut.call(this, clone, key);
                        }
                        throw err;
                    }
                };
            }
        });
        await page.goto('/');
        
        // Handle console logs from the page
        page.on('console', msg => {
            console.log('PAGE LOG:', msg.text());
        });

        // Open a vault and wait for it to be ready
        console.log('TEST: Clicking OPEN VAULT');
        await page.getByRole('button', { name: 'OPEN VAULT' }).click();
        
        console.log('TEST: Waiting for vault.isInitialized');
        await expect(page.getByTestId('new-entity-button')).toBeVisible({ timeout: 20000 });
    });

    test('Add and remove labels from an entity', async ({ page }) => {
        // 1. Create a new entity
        await page.getByTestId('new-entity-button').click();
        await page.getByPlaceholder('Entry Title...').fill('Test Hero');
        await page.getByRole('button', { name: 'ADD' }).click();

        // 2. Select the entity to open Detail Panel
        await page.getByText('Test Hero').click();

        // 3. Add a label
        const labelInput = page.getByPlaceholder('Add label...');
        await labelInput.fill('Legendary');
        await labelInput.press('Enter');

        // 4. Verify label badge exists
        await expect(page.getByText('Legendary', { exact: true })).toBeVisible();

        // 5. Add another label
        await labelInput.fill('MIA');
        await labelInput.press('Enter');
        await expect(page.getByText('MIA', { exact: true })).toBeVisible();

        // 6. Reload and verify persistence
        await page.reload();
        await page.getByText('Test Hero').click();
        await expect(page.getByText('Legendary', { exact: true })).toBeVisible();
        await expect(page.getByText('MIA', { exact: true })).toBeVisible();

        // 7. Remove a label
        await page.getByRole('button', { name: 'Remove label MIA' }).click();
        await expect(page.getByText('MIA', { exact: true })).not.toBeVisible();
        await expect(page.getByText('Legendary', { exact: true })).toBeVisible();
    });

    test('Filter graph by labels and clear filter', async ({ page }) => {
        // 1. Create two entities with different labels
        await page.getByTestId('new-entity-button').click();
        await page.getByPlaceholder('Entry Title...').fill('Alpha');
        await page.getByRole('button', { name: 'ADD' }).click();
        await page.getByText('Alpha').click();
        await page.getByPlaceholder('Add label...').fill('Group A');
        await page.getByPlaceholder('Add label...').press('Enter');

        await page.getByTestId('new-entity-button').click();
        await page.getByPlaceholder('Entry Title...').fill('Beta');
        await page.getByRole('button', { name: 'ADD' }).click();
        await page.getByText('Beta').click();
        await page.getByPlaceholder('Add label...').fill('Group B');
        await page.getByPlaceholder('Add label...').press('Enter');

        // 2. Filter by Group A
        await page.getByRole('button', { name: 'Labels (0)' }).click();
        await page.getByRole('button', { name: 'Group A' }).click();
        
        // Wait for graph update (nodes are added/removed from DOM via Cytoscape, but we can check the Label dropdown count or some other indicator)
        // Better: Check that the Graph Store elements count changed if we exposed it, 
        // or just verify the dropdown says "Labels (1)"
        await expect(page.getByRole('button', { name: 'Labels (1)' })).toBeVisible();

        // 3. Clear filters
        await page.getByRole('button', { name: 'Clear All' }).click();
        await expect(page.getByRole('button', { name: 'Labels (0)' })).toBeVisible();
    });
});

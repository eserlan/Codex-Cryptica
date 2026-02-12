import { test, expect } from '@playwright/test';

test.describe('Vault Import E2E', () => {
    test.beforeEach(async ({ page }) => {
        // Mock the File System Access API
        await page.addInitScript(() => {
            (window as any).DISABLE_ONBOARDING = true;

            // Mock directory structure
            const mockFiles = [
                { path: ['note1.md'], content: '---\nid: note1\ntitle: Note 1\n---\nBody 1' },
                { path: ['images', 'hero.png'], content: 'fake-image-binary-content' },
                { path: ['subdir', 'note2.markdown'], content: '---\nid: note2\ntitle: Note 2\n---\nBody 2' },
            ];

            function createMockHandle(name: string, kind: 'file' | 'directory', fullPath: string[] = []): any {
                if (kind === 'file') {
                    const fileData = mockFiles.find(f => f.path.join('/') === fullPath.join('/'));
                    return {
                        kind: 'file',
                        name,
                        getFile: async () => new File([fileData?.content || ''], name),
                    };
                }

                return {
                    kind: 'directory',
                    name,
                    async *entries() {
                        // Find unique first segments for sub-items
                        const subItems = new Map<string, 'file' | 'directory'>();
                        for (const f of mockFiles) {
                            if (f.path.length > fullPath.length && f.path.slice(0, fullPath.length).every((v, i) => v === fullPath[i])) {
                                const subName = f.path[fullPath.length];
                                const type = f.path.length === fullPath.length + 1 ? 'file' : 'directory';
                                subItems.set(subName, type);
                            }
                        }
                        for (const [subName, type] of subItems.entries()) {
                            yield [subName, createMockHandle(subName, type, [...fullPath, subName])];
                        }
                    },
                    // Legacy support or fallback
                    async *values() {
                        for await (const [_name, handle] of (this as any).entries()) {
                            yield handle;
                        }
                    }
                };
            }

            window.showDirectoryPicker = async () => {
                return createMockHandle('root', 'directory');
            };
        });

        await page.goto('/');
        await expect(page.getByTestId('graph-canvas')).toBeVisible({ timeout: 10000 });
    });

    test('should import recursive files and non-markdown assets from a local folder', async ({ page }) => {
        // Increase timeout for this specific test as it involves complex flow
        test.setTimeout(60000);

        // 1. Open Vault Switcher
        await page.getByTitle('Switch Vault').click();
        await page.getByRole('button', { name: 'NEW VAULT' }).click();

        const vaultName = 'Imported Vault';
        await page.getByPlaceholder('Vault Name...').fill(vaultName);

        // 2. Click IMPORT (this triggers our mocked showDirectoryPicker)
        await page.getByRole('button', { name: 'IMPORT' }).click();

        // 3. Verify the switcher closes and the vault is active
        await expect(page.getByTitle('Switch Vault')).toContainText(vaultName);

        // 4. Verify entities were loaded in the switcher
        await page.getByTitle('Switch Vault').click();
        const vaultRow = page.locator('.group', { hasText: vaultName }).last();
        await expect(vaultRow).toContainText('2 Items');

        // Closing switcher
        await page.keyboard.press('Escape');

        // 5. Verify the main UI also shows the count
        await expect(page.getByTestId('entity-count')).toContainText('2 ENTITIES');

        // 6. Verify search can find the imported entities
        await page.keyboard.press('Control+k');
        await page.getByPlaceholder('Search notes...').fill('Note 2');
        await expect(page.getByText('Note 2')).toBeVisible();
    });
});

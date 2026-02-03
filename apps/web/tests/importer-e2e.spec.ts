import { test, expect } from "@playwright/test";

test.describe("Intelligent Importer E2E", () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            (window as any).DISABLE_ONBOARDING = true;
            // Mock directory picker
            (window as any).showDirectoryPicker = async () => ({
                kind: "directory",
                name: "test-vault",
                requestPermission: async () => "granted",
                queryPermission: async () => "granted",
                values: () => [],
                getDirectoryHandle: async () => ({
                    kind: "directory",
                    getFileHandle: async () => ({
                        kind: "file",
                        createWritable: async () => ({
                            write: async () => { },
                            close: async () => { }
                        })
                    })
                })
            });
        });

        await page.goto("/");
        await page.waitForFunction(() => (window as any).uiStore !== undefined);

        // Inject fake API key and mock vault methods
        await page.evaluate(() => {
            (window as any).oracle.apiKey = "fake-key";
            const vault = (window as any).vault;
            // Mock batch operations to avoid real IO/DB failures
            vault.batchCreateEntities = async (data: any[]) => {
                data.forEach(item => {
                    const id = item.title.toLowerCase().replace(/\s+/g, '-');
                    vault.entities[id] = {
                        id,
                        title: item.title,
                        type: item.type,
                        content: item.initialData.content,
                        lore: item.initialData.lore,
                        labels: item.initialData.labels,
                        connections: item.initialData.connections
                    };
                });
                return Promise.resolve();
            };
            vault.saveImportedAsset = async () => ({ image: 'mock.png', thumbnail: 'mock-thumb.png' });
        });
    });

    test("should block modal exit during active import and allow abort", async ({ page }) => {
        // 1. Open Settings -> Vault (where Importer lives)
        await page.getByTitle("Application Settings").click();
        await expect(page.locator('h2', { hasText: 'Vault' })).toBeVisible();

        // 2. Mock Gemini API with a slow response
        let resolveRequest: any;
        const requestHold = new Promise(resolve => resolveRequest = resolve);

        await page.route('**/v1beta/models/gemini-*:generateContent*', async route => {
            await requestHold;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    candidates: [{
                        content: {
                            parts: [{
                                text: JSON.stringify([{
                                    title: 'Ghost Entity',
                                    type: 'Character',
                                    chronicle: 'Summary',
                                    lore: 'Lore'
                                }])
                            }]
                        }
                    }]
                })
            });
        });

        // 3. Trigger file import
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'test.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('Ghost Entity Lore Content')
        });

        // 4. Verify step moves to 'processing'
        await expect(page.locator('p:has-text("Analyzing test.txt with Oracle...")')).toBeVisible();

        // 5. Try to close and dismiss (stay in modal)
        page.once('dialog', async dialog => {
            expect(dialog.message()).toContain("import is in progress or pending review");
            await dialog.dismiss();
        });
        
        // Trigger close without awaiting (as it will hang until dialog is handled)
        page.evaluate(() => {
            (document.querySelector('button[aria-label="Close Settings"]') as HTMLElement).click();
        });

        await expect(page.locator('[role="dialog"]')).toBeVisible();

        // 6. Now try to close and actually abort
        page.once('dialog', async dialog => {
            await dialog.accept();
        });
        
        page.evaluate(() => {
            (document.querySelector('button[aria-label="Close Settings"]') as HTMLElement).click();
        });

        // 7. Verify modal closes
        await expect(page.locator('[role="dialog"]')).not.toBeVisible();

        // 8. Clean up
        resolveRequest();
    });

    test("should map chronicle and lore fields correctly to vault", async ({ page }) => {
        // 1. Mock Gemini API with split chronicle/lore
        await page.route('**/v1beta/models/gemini-*:generateContent*', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    candidates: [{
                        content: {
                            parts: [{
                                text: JSON.stringify([{
                                    title: 'Valeria',
                                    type: 'Character',
                                    chronicle: 'A master assassin.',
                                    lore: 'Trained in the shadow isles since she was five.',
                                    frontmatter: { alignment: 'Neutral' }
                                }])
                            }]
                        }
                    }]
                })
            });
        });

        await page.getByTitle("Application Settings").click();
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'valeria.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('Valeria is a master assassin...')
        });

        // 2. Wait for Review step
        await expect(page.locator('h3:has-text("Review Identified Entities")')).toBeVisible();
        await expect(page.locator('text=Valeria')).toBeVisible();
        await expect(page.locator('text=A master assassin.')).toBeVisible();

        // 3. Click Import
        await page.click('button:has-text("Import 1 Items")');

        // 4. Verify Success
        await expect(page.locator('text=Import Successful')).toBeVisible();

        // 5. Check Vault Content via evaluate
        const entity = await page.evaluate(() => {
            const vault = (window as any).vault;
            return Object.values(vault.entities).find((e: any) => e.title === 'Valeria') as any;
        });

        expect(entity).toBeDefined();
        expect(entity.content).toBe('A master assassin.'); // Content maps to chronicle by default in ImportSettings
        expect(entity.lore).toBe('Trained in the shadow isles since she was five.');
    });
});

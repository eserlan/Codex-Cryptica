import { test, expect } from '@playwright/test';

// Mock File System Access API
const mockFileSystem = {
    kind: 'directory',
    name: 'test-vault',
    requestPermission: async () => 'granted',
    queryPermission: async () => 'granted',
    entries: async function* () { yield* []; }, // Default empty async iterator
    getFileHandle: async (name: string) => ({
        kind: 'file',
        name: name,
        getFile: async () => new File(['---\nid: ' + name.replace('.md', '') + '\ntitle: ' + name + '\ntype: npc\n---\n# Content'], name)
    }),
    getDirectoryHandle: async () => mockFileSystem
};

test.describe('Vault E2E', () => {

    test.beforeEach(async ({ page }) => {
        // Debugging: Pipe console logs
        page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
        page.on('pageerror', err => console.log(`BROWSER ERROR: ${err}`));

        // Setup default empty vault mock
        await page.addInitScript(() => {
            // Mock IndexedDB to avoid DataCloneError with mock handles
            const mockIDB = {
                open: () => {
                    const request: any = {};
                    setTimeout(() => {
                        request.result = {
                            createObjectStore: () => { },
                            objectStoreNames: { contains: () => false },
                            transaction: () => ({
                                objectStore: () => ({
                                    put: () => {
                                        const r: any = {};
                                        setTimeout(() => r.onsuccess && r.onsuccess(), 10);
                                        return r;
                                    },
                                    get: () => {
                                        const r: any = {};
                                        setTimeout(() => { r.result = null; if (r.onsuccess) r.onsuccess(); }, 10);
                                        return r;
                                    },
                                    delete: () => {
                                        const r: any = {};
                                        setTimeout(() => r.onsuccess && r.onsuccess(), 10);
                                        return r;
                                    }
                                })
                            })
                        };
                        if (request.onsuccess) request.onsuccess({ target: request });
                    }, 10);
                    return request;
                }
            };

            try {
                // Try simple assignment first
                window.indexedDB = mockIDB as unknown as IDBFactory;
            } catch {
                console.log('Simple assignment failed, trying defineProperty');
            }

            // Force override if simple assignment didn't work or just to be safe
            if (window.indexedDB !== (mockIDB as unknown as IDBFactory)) {
                Object.defineProperty(window, 'indexedDB', {
                    value: mockIDB,
                    writable: true,
                    configurable: true
                });
            }

            const mockFileSystem = {
                kind: 'directory',
                name: 'test-vault',
                requestPermission: async () => 'granted',
                queryPermission: async () => 'granted',
                entries: async function* () { yield* []; },
                values: () => [],
                getFileHandle: async (name: string) => ({
                    kind: 'file',
                    name: name,
                    getFile: async () => new File(['---\nid: ' + name.replace('.md', '') + '\ntitle: ' + name + '\ntype: npc\n---\n# Content'], name)
                }),
                getDirectoryHandle: async () => mockFileSystem
            };

            // @ts-expect-error - Mock browser API
            window.showDirectoryPicker = async () => {
                console.log('MOCK: showDirectoryPicker invoked');
                return mockFileSystem;
            };
        });
        await page.goto('/');
    });

    test('Initial State (No Vault)', async ({ page }) => {
        await expect(page.getByText('No Vault Open')).toBeVisible();
        await expect(page.getByText('Open a folder to visualize your vault')).toBeVisible();
    });

    test('Open Empty Vault', async ({ page }) => {
        await page.getByRole('button', { name: 'Open Vault' }).click();
        await expect(page.getByText('0 Entities')).toBeVisible();
        await expect(page.getByText('Your vault is empty')).toBeVisible();
    });

    test('Open Populated Vault', async ({ page }) => {
        // Inject populated mock
        await page.addInitScript(() => {
            const files = [
                { name: 'Alice.md', kind: 'file', content: '---\nid: alice\ntitle: Alice\ntype: npc\n---\n# Alice' },
                { name: 'Bob.md', kind: 'file', content: '---\nid: bob\ntitle: Bob\ntype: npc\n---\n# Bob' }
            ];

            // @ts-expect-error - Mock browser API
            window.showDirectoryPicker = async () => {
                const mockFS = {
                    kind: 'directory',
                    name: 'test-vault',
                    requestPermission: async () => 'granted',
                    queryPermission: async () => 'granted',
                    values: () => files,
                    // entries needs to yield [name, handle]
                    entries: async function* () {
                        for (const file of files) {
                            const handle = {
                                kind: 'file',
                                name: file.name,
                                getFile: async () => new File([file.content], file.name)
                            };
                            yield [file.name, handle];
                        }
                    },
                    getFileHandle: async (name: string) => ({
                        kind: 'file',
                        name: name,
                        getFile: async () => new File([''], name)
                    }),
                    getDirectoryHandle: async () => mockFS
                };
                return mockFS;
            };
        });

        // Reload to apply new mock *before* interaction if needed, but here we just need to ensure the click uses the new mock.
        // Actually, initScript runs on load. We need to reload to change the mock behavior effectively or overwrite it.
        await page.reload();

        await page.getByRole('button', { name: 'Open Vault' }).click();

        // Verify Header Status
        // Use more specific locator or text to avoid ambiguity
        await expect(page.locator('text=Visualizing 2 entities')).toBeVisible();

        // Verify Entity Cards
        await expect(page.getByText('Alice', { exact: true })).toBeVisible();
        await expect(page.getByText('Bob', { exact: true })).toBeVisible();

        // Check for NPC tag
        const tags = await page.getByText('npc').all();
        expect(tags.length).toBeGreaterThan(0);
    });

    test("Graph View Renders with Height", async ({ page }) => {
        // Reuse populated mock setup logic or just do it inline efficiently
        await page.addInitScript(() => {
            const files = [
                { name: "NodeA.md", kind: "file", content: "---\nid: node-a\ntitle: Node A\ntype: npc\n---\n# Node A" },
                { name: "NodeB.md", kind: "file", content: "---\nid: node-b\ntitle: Node B\ntype: npc\n---\n# Node B" }
            ];
            // @ts-expect-error - Mock browser API
            window.showDirectoryPicker = async () => ({
                kind: "directory", name: "test-vault", requestPermission: async () => "granted", queryPermission: async () => "granted",
                values: () => files,
                entries: async function* () { for (const f of files) yield [f.name, { kind: "file", name: f.name, getFile: async () => new File([f.content], f.name) }]; },
                getFileHandle: async (name: string) => ({ kind: "file", name, getFile: async () => new File([""], name) }),
                getDirectoryHandle: async () => ({})
            });
        });
        await page.reload();
        await page.getByRole("button", { name: "Open Vault" }).click();

        // Wait for graph to be ready
        const canvas = page.locator("canvas").first();
        await expect(canvas).toBeVisible();

        // Check dimensions
        const box = await canvas.boundingBox();
        expect(box?.height).toBeGreaterThan(0);
        expect(box?.width).toBeGreaterThan(0);
    });

    test("Connect Mode UI", async ({ page }) => {
        // Setup vault to enable graph interaction
        await page.addInitScript(() => {
            const files = [{ name: "A.md", kind: "file", content: "---\nid: a\n---\n" }];
            // @ts-expect-error - Mock browser API
            window.showDirectoryPicker = async () => ({
                kind: "directory", name: "test-vault", requestPermission: async () => "granted", queryPermission: async () => "granted",
                values: () => files,
                entries: async function* () { for (const f of files) yield [f.name, { kind: "file", name: f.name, getFile: async () => new File([f.content], f.name) }]; },
                getFileHandle: async (name: string) => ({ kind: "file", name, getFile: async () => new File([""], name) }),
                getDirectoryHandle: async () => ({})
            });
        });
        await page.reload();
        await page.getByRole("button", { name: "Open Vault" }).click();

        // 1. Toggle via Button
        const linkBtn = page.getByTitle("Connect Mode (C)");
        await expect(linkBtn).toBeVisible();
        await linkBtn.click();
        await expect(page.getByText("> SELECT SOURCE NODE")).toBeVisible();

        // Toggle off
        await linkBtn.click();
        await expect(page.getByText("> SELECT SOURCE NODE")).not.toBeVisible();

        // 2. Toggle via Keyboard 'C'
        await page.keyboard.press("c");
        await expect(page.getByText("> SELECT SOURCE NODE")).toBeVisible();

        // 3. Exit via Escape
        await page.keyboard.press("Escape");
        await expect(page.getByText("> SELECT SOURCE NODE")).not.toBeVisible();
    });
});

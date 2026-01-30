import { test, expect } from "@playwright/test";

test.describe("Oracle Response Parsing & Smart Apply", () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            (window as any).DISABLE_ONBOARDING = true;
            // Mock browser API
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
                }),
                getFileHandle: async () => ({
                    kind: "file",
                    name: "test.md",
                    getFile: async () => new File([""], "test.md"),
                    createWritable: async () => ({
                        write: async () => { },
                        close: async () => { }
                    })
                }),
                removeEntry: async () => { }
            });
        });
        await page.goto("/");

        // Enable Oracle by adding a dummy API key to IndexedDB
        await page.waitForFunction(() => (window as any).vault !== undefined && (window as any).aiService !== undefined);
        await page.evaluate(async () => {
            const request = indexedDB.open("CodexArcana", 2);
            request.onupgradeneeded = (e: any) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("settings")) {
                    db.createObjectStore("settings");
                }
            };

            const db: IDBDatabase = await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            const tx = db.transaction("settings", "readwrite");
            const store = tx.objectStore("settings");
            store.put("fake-key", "ai_api_key");
            await new Promise((resolve) => {
                tx.oncomplete = () => resolve(true);
            });
        });

        await page.reload();

        // After reload, apply the vault handle mock
        await page.waitForFunction(() => (window as any).vault !== undefined && (window as any).aiService !== undefined);
        await page.evaluate(async () => {
            const vault = (window as any).vault;
            vault.rootHandle = {
                kind: 'directory',
                name: 'mock-vault',
                getFileHandle: async () => ({
                    kind: 'file',
                    createWritable: async () => ({
                        write: async () => { },
                        close: async () => { }
                    }),
                    getFile: async () => new File([""], "test.md")
                }),
                getDirectoryHandle: async () => ({
                    kind: 'directory',
                    getFileHandle: async () => ({
                        kind: 'file',
                        createWritable: async () => ({
                            write: async () => { },
                            close: async () => { }
                        })
                    })
                }),
                removeEntry: async () => { }
            };
            vault.isAuthorized = true;
        });
    });

    test.skip("should show 'Smart Apply' button for structured Oracle response", async ({ page }) => {
        // 1. Open Oracle
        await page.getByTitle("Open Lore Oracle").click();

        // 2. Inject a structured message into the store
        await page.evaluate(() => {
            const oracle = (window as any).oracle;
            oracle.messages = [
                ...oracle.messages,
                {
                    id: "test-msg-1",
                    role: "assistant",
                    content: "## Chronicle\nA short summary.\n\n## Lore\nDetailed background info."
                }
            ];
        });

        // 3. Select a dummy node to enable 'Apply'
        await page.evaluate(async () => {
            const vault = (window as any).vault;
            const id = await vault.createEntity("npc", "Test Entity");
            vault.selectedEntityId = id;
        });

        // 4. Verify Smart Apply button is visible
        const smartApplyBtn = page.getByRole("button", { name: /SMART APPLY/i });
        await expect(smartApplyBtn).toBeVisible();

        // 5. Hover to see preview (tooltip)
        await smartApplyBtn.hover();
        await expect(page.getByText("Chronicle:")).toBeVisible();
        await expect(page.getByText("A short summary.")).toBeVisible();
        await expect(page.getByText("Lore:")).toBeVisible();
        await expect(page.getByText("Detailed background info.")).toBeVisible();

        // 6. Click Apply and verify vault update
        await smartApplyBtn.click();

        const vaultState = await page.evaluate(() => {
            const vault = (window as any).vault;
            const entity = Object.values(vault.entities)[0] as any;
            return {
                content: entity.content,
                lore: entity.lore
            };
        });

        expect(vaultState.content).toBe("A short summary.");
        expect(vaultState.lore).toBe("Detailed background info.");
    });

    test.skip("should support '/create' command for automatic node generation", async ({ page }) => {
        // 1. Open Oracle
        await page.getByTitle("Open Lore Oracle").click();

        // 2. Mock the AI response for a /create command
        await page.evaluate(() => {
            const aiService = (window as any).aiService;
            aiService.generateResponse = (_k: any, _q: any, _h: any, _c: any, _m: any, onUpdate: any) => {
                const text = "**Name:** Dragon Fire\n**Type:** Spell\n**Chronicle:** Burn everything.\n**Lore:** Ancient magic of the drakes.";
                onUpdate(text);
                return Promise.resolve({ text: () => text });
            };
            aiService.expandQuery = (_k: any, q: any) => Promise.resolve(q);
            aiService.retrieveContext = () => Promise.resolve({ content: "", sourceIds: [] });
        });

        const textarea = page.getByTestId("oracle-input");
        await textarea.fill("/create a dragon spell");
        await page.keyboard.press("Enter");

        // Verify system message confirms creation
        await expect(page.getByText(/Automatically created node: Dragon Fire/i)).toBeVisible();

        // Verify entity exists in vault
        const entityExists = await page.evaluate(() => {
            const vault = (window as any).vault;
            return !!vault.entities["dragon-fire"];
        });
        expect(entityExists).toBe(true);

        const entityData = await page.evaluate(() => {
            const vault = (window as any).vault;
            const e = vault.entities["dragon-fire"];
            return {
                title: e.title,
                type: e.type,
                content: e.content,
                lore: e.lore
            };
        });

        expect(entityData.title).toBe("Dragon Fire");
        expect(entityData.type).toBe("item"); // 'spell' normalized to item
    });
});
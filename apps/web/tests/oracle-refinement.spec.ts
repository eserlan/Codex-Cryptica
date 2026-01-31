import { test, expect } from "@playwright/test";

test.describe("Oracle UI Refinement", () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            (window as any).DISABLE_ONBOARDING = true;
            // Mock window.showDirectoryPicker
            // @ts-expect-error - Mock browser API
            window.showDirectoryPicker = async () => {
                return {
                    kind: "directory",
                    name: "test-vault",
                    requestPermission: async () => "granted",
                    queryPermission: async () => "granted",
                    values: async function* () { yield* []; },
                    getFileHandle: async (name: string) => ({
                        kind: "file",
                        name,
                        getFile: async () => new File([""], name),
                    }),
                    getDirectoryHandle: async (name: string) => ({
                        kind: "directory",
                        name,
                    }),
                };
            };
        });
        await page.goto("/");
        
        // Open Vault
        await page.getByRole("button", { name: "OPEN VAULT" }).click();

        // Enable Oracle by adding a dummy API key to IndexedDB
        await page.evaluate(async () => {
            const request = indexedDB.open("CodexArcana", 2);
            request.onupgradeneeded = (e: any) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("settings")) {
                    db.createObjectStore("settings");
                }
                if (!db.objectStoreNames.contains("chat_history")) {
                    db.createObjectStore("chat_history", { keyPath: "id" });
                }
            };

            const db: IDBDatabase = await new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            const tx = db.transaction("settings", "readwrite");
            tx.objectStore("settings").put("fake-key", "ai_api_key");
            await new Promise((resolve) => tx.oncomplete = resolve);
        });
        await page.reload();

        // Mock Gemini API for text generation
        await page.route("**/models/gemini-*:streamGenerateContent**", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    candidates: [{
                        content: { parts: [{ text: "I am the Oracle." }] }
                    }]
                })
            });
        });
    });

    test("should not display 'user' or 'assistant' labels in chat messages", async ({ page }) => {
        // Open Oracle Window
        await page.getByTitle("Open Lore Oracle").click();

        // Send a message
        const textarea = page.getByTestId("oracle-input");
        await textarea.fill("Hello Oracle");
        await page.keyboard.press("Enter");

        // Verify message content exists
        await expect(page.getByText("Hello Oracle")).toBeVisible();

        // Verify role labels are NOT visible
        const chatWindow = page.locator('.custom-scrollbar');
        
        // Labels are usually in uppercase in the UI
        const userLabel = chatWindow.getByText("USER", { exact: true });
        const assistantLabel = chatWindow.getByText("ASSISTANT", { exact: true });
        
        await expect(userLabel).not.toBeVisible();
        await expect(assistantLabel).not.toBeVisible();
    });

    test("should clear chat history when vault is closed", async ({ page }) => {
        // Open Oracle Window
        await page.getByTitle("Open Lore Oracle").click();

        // Send a message
        const textarea = page.getByTestId("oracle-input");
        await textarea.fill("Persistent Message");
        await page.keyboard.press("Enter");
        
        // Wait for the message to appear in the chat
        await expect(page.locator('div').filter({ hasText: "Persistent Message" }).first()).toBeVisible();

        // Close/Detach Vault
        const closeBtn = page.getByRole("button", { name: "CLOSE" });
        await expect(closeBtn).toBeVisible();
        await closeBtn.click();

        // Wait for vault to actually close (OPEN VAULT button should reappear)
        await expect(page.getByRole("button", { name: "OPEN VAULT" })).toBeVisible();

        // Re-open Oracle if it was closed by vault reset
        const oracleBtn = page.getByTitle("Open Lore Oracle");
        if (await oracleBtn.isVisible()) {
            await oracleBtn.click();
        }

        // Verify message is gone from the chat container
        const chatContainer = page.locator('.custom-scrollbar');
        await expect(chatContainer.getByText("Persistent Message")).not.toBeVisible();
    });
});

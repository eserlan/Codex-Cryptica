import { test, expect } from "@playwright/test";

test.describe("Oracle UI - Elastic Input", () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => (window as any).DISABLE_ONBOARDING = true);
        await page.goto("/");
        // removed eval

        // Enable Oracle by adding a dummy API key to IndexedDB
        await page.evaluate(async () => {
            // Create/open DB
            const request = indexedDB.open("CodexArcana", 2);
            request.onupgradeneeded = (e: any) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("settings")) {
                    db.createObjectStore("settings");
                }
                if (!db.objectStoreNames.contains("vault_cache")) {
                    db.createObjectStore("vault_cache", { keyPath: "path" });
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
    });

    test("should expand textarea when typing multi-line text and reset on submit", async ({ page }) => {
        // Open Oracle Window
        const toggleBtn = page.getByTitle("Open Lore Oracle");
        await toggleBtn.click();

        const textarea = page.getByTestId("oracle-input");
        await expect(textarea).toBeVisible();

        // Get initial height
        const initialBox = await textarea.boundingBox();
        const initialHeight = initialBox?.height || 0;
        console.log(`Initial Height: ${initialHeight}`);
        expect(initialHeight).toBeGreaterThan(0);

        // Type multi-line text (Shift+Enter for newline)
        await textarea.focus();
        await textarea.type("Line 1");
        await page.keyboard.press("Shift+Enter");
        await textarea.type("Line 2");
        await page.keyboard.press("Shift+Enter");
        await textarea.type("Line 3");
        await page.keyboard.press("Shift+Enter");
        await textarea.type("Line 4");

        // Verify height increased
        // Wait for expansion animation/effect
        await page.waitForTimeout(100);
        const expandedBox = await textarea.boundingBox();
        const expandedHeight = expandedBox?.height || 0;
        console.log(`Expanded Height: ${expandedHeight}`);
        expect(expandedHeight).toBeGreaterThan(initialHeight);

        // Submit text (Enter)
        await page.keyboard.press("Enter");

        // Wait for input to clear
        await expect(textarea).toHaveValue("");

        // Verify height reset back to initial
        // We use a more flexible check for resets
        await expect.poll(async () => {
            const box = await textarea.boundingBox();
            return box?.height || 0;
        }).toBeLessThanOrEqual(initialHeight + 2); // Tighter tolerance

        const resetBox = await textarea.boundingBox();
        const resetHeight = resetBox?.height || 0;
        console.log(`Reset Height: ${resetHeight}`);
        expect(resetHeight).toBeLessThanOrEqual(initialHeight + 2);
    });
});

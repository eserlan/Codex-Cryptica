import { test, expect } from "@playwright/test";

test.describe("World Timeline - Graph Integration", () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            (window as any).DISABLE_ONBOARDING = true;
            
            // Mock IDB to prevent errors
            const originalPut = IDBObjectStore.prototype.put;
            IDBObjectStore.prototype.put = function (...args: [unknown, IDBValidKey?]) {
                try { return originalPut.apply(this, args); } catch { return {} as any; }
            };

            // Mock window.showDirectoryPicker
            (window as any).showDirectoryPicker = async () => {
                const createMockFile = (content: string, name: string) => ({
                    kind: 'file',
                    name,
                    getFile: async () => new File([content], name, { type: 'text/markdown' }),
                    createWritable: async () => ({ write: async () => {}, close: async () => {} })
                });

                const f1 = createMockFile(
                    '---\nid: e1\ntitle: Event 1\ntype: event\ndate:\n  year: 1000\n---\n# E1', 
                    'e1.md'
                );
                const f2 = createMockFile(
                    '---\nid: e2\ntitle: Event 2\ntype: event\ndate:\n  year: 2000\n---\n# E2', 
                    'e2.md'
                );

                return {
                    kind: "directory",
                    name: "test-vault",
                    requestPermission: async () => "granted",
                    queryPermission: async () => "granted",
                    values: () => [f1, f2][Symbol.iterator](),
                    entries: () => [['e1.md', f1], ['e2.md', f2]][Symbol.iterator](),
                    getFileHandle: async (name: string) => name === 'e1.md' ? f1 : f2,
                    getDirectoryHandle: async (name: string) => ({ kind: "directory", name }),
                };
            };
        });
        await page.goto("http://localhost:5173/");
    });

    test("should toggle timeline mode", async ({ page }) => {
        // 1. Open Vault
        await page.getByRole("button", { name: "OPEN VAULT" }).click();

        // 2. Wait for entities to load
        await expect(page.getByTestId("entity-count")).toContainText("2 ENTITIES", { timeout: 15000 });

        // 3. Toggle Timeline
        const timelineBtn = page.getByTitle("Toggle Chronological Timeline Mode");
        await expect(timelineBtn).toBeVisible();
        await timelineBtn.click();

        // 4. Verify status indicator
        await expect(page.getByText("Chronological Synchrony Active")).toBeVisible();

        // 5. Verify node positions
        const positions = await page.evaluate(() => {
            const { cy } = window as any;
            if (!cy) return null;
            return {
                e1: cy.$id("e1").position(),
                e2: cy.$id("e2").position()
            };
        });

        expect(positions).not.toBeNull();
        if (positions) {
            // Event 2 (Year 2000) should be to the right of Event 1 (Year 1000)
            expect(positions.e2.x).toBeGreaterThan(positions.e1.x);
        }
    });
});
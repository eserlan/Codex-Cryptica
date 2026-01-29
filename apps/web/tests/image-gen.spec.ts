import { test, expect } from "@playwright/test";

test.describe("Oracle Image Generation", () => {
    test.beforeEach(async ({ page }) => {
        // Inject mocks and keep them persistent
        await page.addInitScript(() => {
            const applyMocks = () => {
                if ((window as any).oracle) {
                    (window as any).oracle.apiKey = "fake-key";
                }
                if ((window as any).vault) {
                    (window as any).vault.isAuthorized = true;
                    (window as any).vault.status = 'idle';
                    (window as any).vault.rootHandle = { kind: 'directory' };
                }
            };
            
            applyMocks();
            // Continuously apply mocks to fight hydration/re-init
            setInterval(applyMocks, 100);
        });

        await page.goto("/");
        await page.waitForLoadState("networkidle");
    });

    test("should trigger image generation and display the result", async ({ page }) => {
        // Mock the generateContent API
        await page.route("**/models/gemini-2.5-flash-image:generateContent**", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    candidates: [{
                        content: { parts: [{ inlineData: { data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", mimeType: "image/png" } }] }
                    }]
                })
            });
        });

        // 1. Open Oracle
        const trigger = page.locator("button[title='Open Lore Oracle']");
        await trigger.waitFor({ state: "visible", timeout: 15000 });
        await trigger.click();
        
        // 2. Type image command
        const input = page.getByTestId("oracle-input");
        await input.fill("/draw a tiny red pixel");
        await page.keyboard.press("Enter");

        // 3. Verify image appears
        const generatedImage = page.locator("img[alt*='tiny red pixel']");
        await expect(generatedImage).toBeVisible({ timeout: 20000 });
        
        // 4. Click to open lightbox
        await generatedImage.click();
        await expect(page.getByTestId("close-lightbox")).toBeVisible();
    });

    test("should allow dragging an image to the detail panel", async ({ page }) => {
        // Mock the generateContent API
        await page.route("**/models/gemini-2.5-flash-image:generateContent**", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    candidates: [{ content: { parts: [{ inlineData: { data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", mimeType: "image/png" } }] } }]
                })
            });
        });

        // 1. Ensure we are in a state where we can create an entity
        const newBtn = page.getByTestId("new-entity-button");
        await newBtn.waitFor({ state: "visible", timeout: 15000 });
        await newBtn.click();
        
        await page.getByPlaceholder("Entry Title...").fill("Test Drag Entity");
        await page.getByRole("button", { name: "ADD" }).click();
        
        // 2. Generate image
        await page.locator("button[title='Open Lore Oracle']").click();
        await page.getByTestId("oracle-input").fill("/draw test drag");
        await page.keyboard.press("Enter");
        
        const generatedImage = page.locator("img[alt*='test drag']");
        await expect(generatedImage).toBeVisible({ timeout: 20000 });

        // 3. Drag and Drop
        const dropZone = page.locator("[aria-label='Image drop zone']");
        await generatedImage.dragTo(dropZone);

        // 4. Verify image appears in drop zone
        await expect(dropZone.locator("img")).toBeVisible();
    });
});

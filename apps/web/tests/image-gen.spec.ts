import { test, expect } from "@playwright/test";

test.describe("Oracle Image Generation", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        // Wait for vault to initialize
        await page.waitForFunction(() => (window as any).vault?.status === 'idle');
        
        // Mock the API key check and vault state
        await page.evaluate(() => {
            if ((window as any).oracle) {
                (window as any).oracle.apiKey = "fake-key";
            }
            if ((window as any).vault) {
                (window as any).vault.rootHandle = { getFileHandle: () => ({}) };
                (window as any).vault.isAuthorized = true;
            }
        });
    });

    test("should trigger image generation and display the result", async ({ page }) => {
        // Mock the Imagen API
        await page.route("**/models/gemini-2.5-flash-image:generateImage**", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    predictions: [
                        {
                            bytesBase64Encoded: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
                            mimeType: "image/png"
                        }
                    ]
                })
            });
        });

        // 1. Open Oracle
        await page.getByTitle("Open Lore Oracle").click();
        
        // 2. Type image command
        const input = page.getByTestId("oracle-input");
        await expect(input).toBeVisible();
        await input.fill("/draw a tiny red pixel");
        await page.keyboard.press("Enter");

        // 3. Verify loading state
        await expect(page.getByText("VISUALIZING...")).toBeVisible();

        // 4. Verify image appears
        const generatedImage = page.locator("img[alt*='tiny red pixel']");
        await expect(generatedImage).toBeVisible({ timeout: 10000 });
        
        // 5. Click to open lightbox
        await generatedImage.click();
        await expect(page.getByTestId("close-lightbox")).toBeVisible();
    });

    test("should allow dragging an image to the detail panel", async ({ page }) => {
        // 1. Mock createEntity to avoid filesystem errors
        await page.evaluate(() => {
            if ((window as any).vault) {
                (window as any).vault.createEntity = async (type: string, title: string) => {
                    const id = title.toLowerCase().replace(/\s+/g, '-');
                    const newEntity = {
                        id,
                        type,
                        title,
                        content: "",
                        connections: [],
                        tags: [],
                        metadata: {}
                    };
                    (window as any).vault.entities[id] = newEntity;
                    (window as any).vault.selectedEntityId = id;
                    return id;
                };
                (window as any).vault.saveImageToVault = async (blob: Blob, id: string) => {
                    if ((window as any).vault.entities[id]) {
                        (window as any).vault.entities[id].image = "mock-image-path.png";
                    }
                    return "mock-image-path.png";
                };
            }
        });

        await page.getByRole("button", { name: "NEW" }).click();
        
        const titleInput = page.getByPlaceholder("Entry Title...");
        await expect(titleInput).toBeVisible();
        await titleInput.fill("Test Image Entity");
        await page.getByRole("button", { name: "ADD" }).click();
        
        // Wait for selection
        await expect(page.locator("h2", { hasText: "Test Image Entity" })).toBeVisible();

        // 2. Generate an image (mocked)
        await page.route("**/models/gemini-2.5-flash-image:generateImage**", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    predictions: [{ bytesBase64Encoded: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", mimeType: "image/png" }]
                })
            });
        });

        await page.getByTitle("Open Lore Oracle").click();
        const oracleInput = page.getByTestId("oracle-input");
        await oracleInput.fill("/draw test drag");
        await page.keyboard.press("Enter");
        
        const generatedImage = page.locator("img[alt*='test drag']");
        await expect(generatedImage).toBeVisible({ timeout: 10000 });

        // 3. Drag and Drop
        const dropZone = page.locator("[aria-label='Image drop zone']");
        await expect(dropZone).toBeVisible();

        await generatedImage.dragTo(dropZone);

        // 4. Verify the entity now has an image
        // The dropZone itself should now contain the img (not just the placeholder)
        await expect(dropZone.locator("img")).toBeVisible();
    });
});
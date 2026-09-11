import { test, expect } from "@playwright/test";
import { setupVaultPage, openOracle, seedEntity } from "./test-helpers";

test.describe("Oracle Image Generation", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);

    await page.evaluate(async () => {
      if ((window as any).oracle) {
        await (window as any).oracle.setKey("fake-key");
      }
    });
  });

  test("should trigger image generation and display the result", async ({
    page,
  }) => {
    // Mock the generateContent API
    await page.route("**/models/*:generateContent**", async (route) => {
      const postData = route.request().postDataJSON();
      const isImageRequest =
        postData?.generationConfig?.response_modalities?.includes("IMAGE");

      if (isImageRequest) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      inlineData: {
                        data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
                        mimeType: "image/png",
                      },
                    },
                  ],
                },
              },
            ],
          }),
        });
      } else {
        // Text request (likely prompt distillation)
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: "Mocked distilled prompt..." }],
                },
              },
            ],
          }),
        });
      }
    });

    await page.route("**/v1/images/generations**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result: {
            image:
              "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          },
        }),
      });
    });

    // 1. Open Oracle
    await openOracle(page);

    // 2. Type image command
    const input = page.getByTestId("oracle-input");
    await expect(input).toBeVisible();
    await input.fill("/draw a tiny red pixel");
    await page.keyboard.press("Enter");

    // 3. Verify image appears
    const generatedImage = page.locator("img[alt*='tiny red pixel']");
    await expect(generatedImage).toBeVisible({ timeout: 30000 });
  });

  test("should allow dragging an image to the detail panel", async ({
    page,
  }) => {
    // 1. Create and select an entity to open detail panel
    await seedEntity(page, {
      title: "Test Drag Entity",
      type: "character",
      select: true,
    });

    // Wait for detail panel to open
    const dropZone = page.locator("[aria-label='Image drop zone']");
    await expect(dropZone).toBeVisible({
      timeout: 15000,
    });

    await page.evaluate(() => {
      const vault = (window as any).vault;
      vault.saveImageToVault = async () => ({
        image: "mock-image.png",
        thumbnail: "mock-thumbnail.png",
      });
      vault.resolveImageUrl = async () =>
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    });

    // 2. Drop a synthetic image file onto the detail panel
    await dropZone.evaluate((zone) => {
      const file = new File(
        [new Uint8Array([137, 80, 78, 71])],
        "synthetic.png",
        { type: "image/png" },
      );
      const dataTransfer = new DataTransfer();

      dataTransfer.items.add(file);
      zone.dispatchEvent(
        new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        }),
      );
    });

    // 3. Verify image appears in drop zone
    await expect(dropZone.locator("img")).toBeVisible({ timeout: 10000 });
  });
});

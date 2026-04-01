import { test, expect } from "@playwright/test";

test.describe("Oracle Image Generation", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      localStorage.setItem("codex_skip_landing", "true");
      // Suppress Oracle onboarding overlay
      localStorage.setItem("codex_oracle_onboarding_dismissed", "true");
    });

    await page.goto("/?s=" + Date.now());
    await page.waitForFunction(
      () =>
        (window as any).uiStore !== undefined &&
        (window as any).oracle !== undefined,
    );

    await page.evaluate(async () => {
      await (window as any).oracle.setKey("fake-key");
      if ((window as any).vault) {
        (window as any).vault.status = "idle";
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

    // 1. Open Oracle
    const trigger = page.locator("button[title='Open Lore Oracle']");
    await trigger.waitFor({ state: "visible", timeout: 15000 });
    await trigger.click();

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
    // 1. Ensure we are in a state where we can create an entity
    const newBtn = page.getByTestId("new-entity-button");
    await newBtn.waitFor({ state: "visible", timeout: 15000 });
    await newBtn.click();

    const titleInput = page.getByPlaceholder(/Title.../i);
    await titleInput.fill("Test Drag Entity");

    const addBtn = page.getByRole("button", { name: "ADD" });
    await expect(addBtn).toBeEnabled({ timeout: 5000 });
    await addBtn.click();

    // Wait for detail panel to open
    await expect(page.locator("[aria-label='Image drop zone']")).toBeVisible({
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
    const dropZone = page.locator("[aria-label='Image drop zone']");
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

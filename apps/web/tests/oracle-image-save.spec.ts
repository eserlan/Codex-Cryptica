import { test, expect } from "@playwright/test";

test.describe("Oracle Image Save to Entity", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__SHARED_GEMINI_KEY__ = "fake-key";
    });

    await page.goto("/");
    // Wait for vault to initialize
    await page.waitForFunction(
      () =>
        (window as any).vault?.isInitialized &&
        (window as any).vault?.status === "idle",
    );
  });

  test("should save generated image to selected entity and update thumbnail", async ({
    page,
  }) => {
    // 1. Create a test entity
    await page.evaluate(async () => {
      const v = (window as any).vault;
      await v.createEntity("character", "Test Character", {
        id: "test-character",
      });
    });

    // 2. Select the test entity
    await page.evaluate(() => {
      (window as any).vault.selectedEntityId = "test-character";
      (window as any).oracle.isOpen = true; // Open the Oracle chat window
    });

    // 3. Mock AI image generation
    const imageUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="; // A 1x1 transparent PNG
    await page.evaluate(
      async (data) => {
        // Generate a valid Blob directly in the browser context
        const response = await fetch(data.mockImageUrl);
        const mockBlob = await response.blob();
        (window as any).oracle.addTestImageMessage(
          "Here is your image.",
          data.mockImageUrl,
          mockBlob, // Pass the directly generated Blob
        );
      },
      { mockImageUrl: imageUrl },
    );

    // 4. Wait for the oracle.messages array to contain the image message
    await page.waitForFunction(() => {
      const oracleMessages = (window as any).oracle.messages;
      return oracleMessages.some(
        (msg: any) =>
          msg.type === "image" &&
          msg.imageUrl ===
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
      );
    });

    // 5. Wait for the image message to appear in the DOM
    const expectedAltText = "Here is your image.";
    await page.waitForSelector(
      `img[alt="${expectedAltText.replace(/"/g, '\\"')}"]`,
    ); // Escape quotes
    await expect(
      page.locator(`img[alt="${expectedAltText.replace(/"/g, '\\"')}"]`),
    ).toBeVisible();

    // 6. Click the "SAVE TO ENTITY" button
    await page.getByRole("button", { name: "SAVE TO TEST CHARACTER" }).click();

    // 6. Verify archiving message disappears
    await expect(page.getByText("ARCHIVING...")).not.toBeVisible();

    // 7. Wait for the entity to be updated in the vault store
    await page.waitForFunction(() => {
      const entity = (window as any).vault.entities["test-character"];
      return entity && entity.image && entity.thumbnail;
    });

    // 8. Verify the entity's image and thumbnail are updated
    const entityAfterSave = await page.evaluate(async () => {
      return (window as any).vault.entities["test-character"];
    });

    expect(entityAfterSave.image).toMatch(
      /^images\/img_test-character_\d+\.webp$/,
    );
    expect(entityAfterSave.thumbnail).toMatch(
      /^images\/img_test-character_\d+_thumb\.webp$/,
    );

    // Optional: Verify file content type in OPFS if directly accessible (advanced)
    // This is hard to do in E2E without exposing more internal APIs.
    // Relying on the updateEntity and filename check for now.
  });
});

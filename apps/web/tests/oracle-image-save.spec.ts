import { test, expect } from "@playwright/test";
import { setupVaultPage, openOracle, seedEntity } from "./test-helpers";

test.describe("Oracle Image Save to Entity", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  test("should save generated image to selected entity and update thumbnail", async ({
    page,
  }) => {
    // 1. Create and select test entity
    await seedEntity(page, {
      id: "test-character",
      title: "Test Character",
      type: "character",
      select: true,
    });

    // 2. Open Oracle
    await openOracle(page);

    // 3. Mock AI image generation
    const imageUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    await page.evaluate(
      async (data) => {
        const response = await fetch(data.mockImageUrl);
        const mockBlob = await response.blob();
        (window as any).oracle.addTestImageMessage(
          "Here is your image.",
          data.mockImageUrl,
          mockBlob,
        );
      },
      { mockImageUrl: imageUrl },
    );

    // 4. Wait for the oracle.messages array to contain the image message
    await page.waitForFunction(() => {
      const oracleMessages = (window as any).oracle.messages;
      return oracleMessages.some((msg: any) => msg.type === "image");
    });

    // 5. Wait for the image message to appear in the DOM
    const expectedAltText = "Here is your image.";
    await page.waitForSelector(
      `img[alt="${expectedAltText.replace(/"/g, '\\"')}"]`,
    );
    await expect(
      page.locator(`img[alt="${expectedAltText.replace(/"/g, '\\"')}"]`),
    ).toBeVisible();

    // 6. Click the "SAVE TO ENTITY" button
    await page
      .getByRole("button", { name: /SAVE TO (TEST CHARACTER|ENTITY)/i })
      .click();

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
  });
});

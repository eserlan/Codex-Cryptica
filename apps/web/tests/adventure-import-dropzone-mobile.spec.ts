import { expect, test } from "@playwright/test";
import { setupVaultPage } from "./test-helpers";

test.describe("Adventure JSON import dropzone responsive layout (#4986)", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
    await page.goto("/adventure#import-adventure-json");
    await page.getByTestId("adventure-json-dropzone").waitFor({
      state: "visible",
    });
  });

  for (const width of [320, 390]) {
    test(`stacks copy above full-width CTA without vertical word-column collapse at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });

      const dropzone = page.getByTestId("adventure-json-dropzone");
      const description = page.locator("#adventure-import-description");
      const button = page.getByTestId("adventure-import");
      const guideLink = page.getByTestId("adventure-import-guide-link");
      const experimentalLabel = page.getByTestId(
        "adventure-experimental-import-label",
      );

      const [zoneBox, descBox, btnBox, guideBox, expBox] = await Promise.all([
        dropzone.boundingBox(),
        description.boundingBox(),
        button.boundingBox(),
        guideLink.boundingBox(),
        experimentalLabel.boundingBox(),
      ]);

      expect(zoneBox).not.toBeNull();
      expect(descBox).not.toBeNull();
      expect(btnBox).not.toBeNull();
      expect(guideBox).not.toBeNull();
      expect(expBox).not.toBeNull();

      // Copy must span readable lines rather than collapsing to a narrow column.
      expect(descBox!.width).toBeGreaterThanOrEqual(width === 320 ? 170 : 220);
      expect(descBox!.height).toBeLessThanOrEqual(180);

      // Upload CTA is stacked below description, touch-sized, and full-width.
      expect(btnBox!.y).toBeGreaterThanOrEqual(
        descBox!.y + descBox!.height - 2,
      );
      expect(btnBox!.height).toBeGreaterThanOrEqual(44);
      expect(btnBox!.width).toBeGreaterThanOrEqual(zoneBox!.width - 60);

      // No horizontal overflow or clipping of dropzone controls.
      expect(guideBox!.x + guideBox!.width).toBeLessThanOrEqual(
        zoneBox!.x + zoneBox!.width + 2,
      );
      expect(expBox!.x + expBox!.width).toBeLessThanOrEqual(
        zoneBox!.x + zoneBox!.width + 2,
      );
      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(hasHorizontalOverflow).toBe(false);
    });
  }

  test("places the upload CTA side-by-side at 768px with readable copy and no overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 900 });

    const description = page.locator("#adventure-import-description");
    const button = page.getByTestId("adventure-import");
    const [descBox, btnBox] = await Promise.all([
      description.boundingBox(),
      button.boundingBox(),
    ]);

    expect(descBox).not.toBeNull();
    expect(btnBox).not.toBeNull();
    expect(descBox!.width).toBeGreaterThanOrEqual(260);
    expect(btnBox!.x).toBeGreaterThanOrEqual(descBox!.x + descBox!.width - 2);
    expect(btnBox!.height).toBeGreaterThanOrEqual(44);

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});

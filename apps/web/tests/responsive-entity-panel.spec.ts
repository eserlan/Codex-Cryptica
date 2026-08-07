import { test, expect } from "@playwright/test";
import {
  openEntitySidepanel,
  seedEntities,
  setupVaultPage,
} from "./test-helpers";

test.describe("Responsive Entity Detail Panel", () => {
  const longEntityName =
    "Archmage Thaddeus Bartholomew III of the High Council of Elements";
  const longLabel =
    "Extremely Long Label That Might Break The Layout If Not Carefully Managed";

  const viewports = [
    { width: 1280, height: 800 },
    { width: 1440, height: 900 },
    { width: 1600, height: 1000 },
  ];

  for (const viewport of viewports) {
    test(`does not overflow or clip at ${viewport.width}px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await setupVaultPage(page);
      await seedEntities(page, [
        {
          id: "stress-test-entity",
          title: longEntityName,
          type: "character",
          content: "This is a test character with very long fields.",
          data: { labels: ["mage", longLabel] },
        },
        {
          id: "normal-entity",
          title: "Bob",
          type: "character",
          content: "A normal guy.",
          data: { labels: ["human"] },
        },
      ]);
      await openEntitySidepanel(page, "stress-test-entity");

      const panel = page.getByTestId("entity-detail-panel");
      await expect(panel).toBeVisible();

      // Check that the document doesn't have a horizontal scrollbar
      const hasHorizontalScroll = await page.evaluate(() => {
        return (
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth
        );
      });
      expect(hasHorizontalScroll).toBeFalsy();

      // Check that tabs don't overflow the panel
      const tabList = page.getByRole("tablist");
      const tabListBounds = await tabList.boundingBox();
      const panelBounds = await panel.boundingBox();

      if (tabListBounds && panelBounds) {
        expect(tabListBounds.width).toBeLessThanOrEqual(panelBounds.width);
      }

      // Ensure actions are reachable
      const zenModeBtn = page.locator(
        '[data-testid="enter-zen-mode-button"]:visible',
      );
      await expect(zenModeBtn).toBeVisible();

      // Take a screenshot to verify layout
      await expect(panel).toHaveScreenshot(
        `entity-panel-stress-${viewport.width}.png`,
        {
          maxDiffPixelRatio: 0.1,
        },
      );
    });
  }
});

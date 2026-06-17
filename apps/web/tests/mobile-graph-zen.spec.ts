import { test, expect } from "@playwright/test";
import { seedEntity, setupVaultPage } from "./test-helpers";

test.describe("Mobile Graph Zen Mode", () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await setupVaultPage(page);

    // Ensure uiStore knows it's mobile (might need a short wait for matchMedia to fire)
    await page.waitForFunction(
      () => (window as any).uiStore?.isMobile === true,
      { timeout: 5000 },
    );
  });

  test("should open Zen mode directly from a graph node single tap on mobile", async ({
    page,
  }) => {
    const nodeId = await seedEntity(page, {
      type: "npc",
      title: "Mobile Tap Node",
      content: "Mobile Content",
    });

    await page.evaluate((id) => {
      const cy = (window as any).cy;
      const node = cy.$id(id);
      node.trigger("tap", { renderedPosition: node.renderedPosition() });
    }, nodeId);

    // Zen Mode modal should appear
    const modal = page.getByTestId("zen-mode-modal");
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Check title in Zen mode
    const titleElement = modal.getByTestId("entity-title");
    await expect(titleElement).toHaveText("Mobile Tap Node");

    // Close Zen Mode
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();

    // Verify node is not selected in Cytoscape
    const isSelected = await page.evaluate((id) => {
      const cy = (window as any).cy;
      return cy.$id(id).selected();
    }, nodeId);

    expect(isSelected).toBe(false);
  });
});

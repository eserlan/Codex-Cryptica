import { test, expect } from "@playwright/test";

test.describe("Mobile Graph Zen Mode", () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });

    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      localStorage.setItem("codex_skip_landing", "true");
    });

    await page.goto("/");
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 15000,
    });

    // Ensure uiStore knows it's mobile (might need a short wait for matchMedia to fire)
    await page.waitForFunction(
      () => (window as any).uiStore?.isMobile === true,
      { timeout: 5000 },
    );

    await page.evaluate(() => {
      const ui = (window as any).uiStore;
      if (ui) {
        ui.dismissedWorldPage = true;
        ui.dismissedLandingPage = true;
      }
    });
  });

  test("should open Zen mode directly from a graph node single tap on mobile", async ({
    page,
  }) => {
    // Create an entity directly via evaluate to ensure it exists for the graph
    await page.evaluate(async () => {
      const vault = (window as any).vault;
      vault.isInitialized = true;
      vault.rootHandle = {};
      return await vault.createEntity("npc", "Mobile Tap Node", {
        content: "Mobile Content",
      });
    });

    const nodeIdHandle = await page.waitForFunction(
      () => {
        const vault = (window as any).vault;
        const entity = Object.values(vault?.entities || {}).find(
          (item: any) => item.title === "Mobile Tap Node",
        );
        return entity ? (entity as any).id : null;
      },
      { timeout: 10000 },
    );
    const nodeId = (await nodeIdHandle.jsonValue()) as string;

    // Wait for node to appear in graph
    await page.waitForFunction(
      (id) => {
        const cy = (window as any).cy;
        return cy && cy.$id(id).length > 0;
      },
      nodeId,
      { timeout: 10000 },
    );

    const canvasBox = await page.getByTestId("graph-canvas").boundingBox();
    const nodePosition = await page.evaluate((id) => {
      const cy = (window as any).cy;
      return cy.$id(id).renderedPosition();
    }, nodeId);

    expect(canvasBox).not.toBeNull();
    if (!canvasBox) return;

    // Single click/tap
    await page.mouse.click(
      canvasBox.x + nodePosition.x,
      canvasBox.y + nodePosition.y,
    );

    // Zen Mode modal should appear
    const modal = page.getByTestId("zen-mode-modal");
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Check title in Zen mode
    const titleElement = modal.getByTestId("entity-title");
    await expect(titleElement).toHaveText("Mobile Tap Node");

    // Close Zen Mode
    await modal.getByRole("button", { name: "Close" }).click();
    await expect(modal).toBeHidden();

    // Verify node is not selected in Cytoscape
    const isSelected = await page.evaluate((id) => {
      const cy = (window as any).cy;
      return cy.$id(id).selected();
    }, nodeId);

    expect(isSelected).toBe(false);
  });
});

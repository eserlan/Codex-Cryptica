import { test, expect } from "@playwright/test";

test.describe("Graph Fit to Screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
    });
  });

  test("should reset graph zoom and pan when fit button is clicked", async ({
    page,
  }) => {
    await page.goto("/");

    // Wait for graph canvas
    const canvas = page.getByTestId("graph-canvas");
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Create entities via vault API for proper reactivity
    await page.evaluate(async () => {
      const vault = (window as any).vault;
      await vault.createEntity("character", "Node 1", {
        content: "Content 1",
      });
      await vault.createEntity("character", "Node 2", {
        content: "Content 2",
      });
      await vault.addConnection("node-1", "node-2", "related_to");
    });

    // Wait for graph to render with nodes
    await page.waitForFunction(() => (window as any).cy?.nodes().length > 0, {
      timeout: 15000,
    });

    // 2. Deliberately mess up the view (pan and zoom way out)
    await page.evaluate(() => {
      const cy = (window as any).cy;
      cy.pan({ x: 1000, y: 1000 });
      cy.zoom(0.1);
    });

    // 3. Click "Fit to Screen" button
    const fitBtn = page.getByTitle("Fit to Screen");
    await expect(fitBtn).toBeVisible();
    await fitBtn.click();

    // 4. Verify graph view has changed (it animates, so we wait a bit)
    await page.waitForTimeout(1000);

    const finalView = await page.evaluate(() => {
      const cy = (window as any).cy;
      return {
        pan: cy.pan(),
        zoom: cy.zoom(),
      };
    });

    // Verify it's no longer at the messed up position/zoom
    expect(finalView.pan.x).not.toBe(1000);
    expect(finalView.pan.y).not.toBe(1000);
    expect(finalView.zoom).not.toBe(0.1);

    // It should be closer to some reasonable value (fitting logic depends on viewport size)
    expect(finalView.zoom).toBeGreaterThan(0.1);
  });
});

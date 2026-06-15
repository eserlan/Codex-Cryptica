import { test, expect } from "@playwright/test";
import { seedEntity, setupVaultPage } from "./test-helpers";

test.describe("Find in Graph Button", () => {
  test("should center the graph on the node when clicked", async ({ page }) => {
    page.on("console", (msg) => console.log(`[PAGE] ${msg.text()}`));
    await setupVaultPage(page);

    // Create a node
    const nodeId = await seedEntity(page, { title: "Target Node" });

    // Wait for entities to be created in the UI
    await expect(page.getByTestId("entity-count")).toHaveText(/1\s+NOTE/, {
      timeout: 10000,
    });

    // Wait until Cytoscape (window.cy) is initialized and contains the created node
    await page.waitForFunction(
      (id) => {
        const cy = (window as any).cy;
        return cy && cy.$id(id).length > 0;
      },
      nodeId,
      { timeout: 10000 },
    );

    // Open node in sidebar via direct state change
    await page.evaluate((id) => {
      (window as any).vault.selectedEntityId = id;
    }, nodeId);

    // Wait for sidebar button
    const findBtn = page.getByTestId("find-in-graph-button").last();
    await expect(findBtn).toBeVisible({ timeout: 10000 });

    // Pan the graph far away
    await page.evaluate(() => {
      const cy = (window as any).cy;
      cy.stop(); // Stop any ongoing animations
      cy.panBy({ x: 1000, y: 1000 });
    });

    // Wait for pan to settle
    await page.waitForTimeout(500);

    // Capture the moved viewport so we can verify the button changes it.
    const initialPan = await page.evaluate(() => {
      const cy = (window as any).cy;
      return cy.pan();
    });

    const initialFocusState = await page.evaluate((id) => {
      const cy = (window as any).cy;
      const node = cy.$id(id);
      const pos = node.renderedPosition();
      const centerX = cy.width() / 2;
      const centerY = cy.height() / 2;
      return {
        isCentered:
          Math.abs(pos.x - centerX) < 50 && Math.abs(pos.y - centerY) < 50,
      };
    }, nodeId);

    expect(initialFocusState.isCentered).toBe(false);

    // Click Find in Graph button
    await findBtn.click({ force: true });

    // Wait for the graph viewport to change after the find action.
    await page.waitForFunction(
      (beforePan) => {
        const cy = (window as any).cy;
        if (!cy) return false;
        const pan = cy.pan();
        return (
          Math.abs(pan.x - beforePan.x) > 1 || Math.abs(pan.y - beforePan.y) > 1
        );
      },
      initialPan,
      { timeout: 10000 },
    );
  });
});

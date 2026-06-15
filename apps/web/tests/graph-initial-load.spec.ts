import { test, expect } from "@playwright/test";
import {
  seedEntities,
  setupVaultPage,
  waitForVaultReady,
} from "./test-helpers";

test.describe("Graph Initial Load", () => {
  test("all nodes in cytoscape are visible and not pending layout on page load/reload", async ({
    page,
  }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER] [${msg.type()}] ${msg.text()}`);
    });

    await setupVaultPage(page);
    await seedEntities(page, [
      { title: "Test Source" },
      { title: "Test Target" },
    ]);

    // Wait for entities count to show 2 notes
    await expect(page.getByTestId("entity-count")).toHaveText(/2\s+NOTES/, {
      timeout: 10000,
    });

    // Now reload the page to simulate initial load with pre-existing nodes
    await page.reload();
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 10000,
    });

    // Wait for vault to finish loading
    await waitForVaultReady(page);

    // Check if there are indeed 2 nodes in cytoscape
    const nodesCount = await page.evaluate(() => {
      const cy = (window as any).cy;
      return cy ? cy.nodes().length : 0;
    });

    expect(nodesCount).toBe(2);

    // Verify no nodes remain with isPendingLayout or pending-layout class
    // This will wait for the load finalization layout to compute and execute.
    await page.waitForFunction(
      () => {
        const cy = (window as any).cy;
        if (!cy) return false;
        const pendingCount =
          cy.nodes("[isPendingLayout]").length +
          cy.nodes(".pending-layout").length;
        return pendingCount === 0;
      },
      null,
      { timeout: 15000 },
    );

    // Verify all nodes have opacity != 0
    const hiddenNodesCount = await page.evaluate(() => {
      const cy = (window as any).cy;
      if (!cy) return 0;
      return cy
        .nodes()
        .filter(
          (n: any) => n.style("opacity") === "0" || n.style("opacity") === 0,
        ).length;
    });

    expect(hiddenNodesCount).toBe(0);
  });
});

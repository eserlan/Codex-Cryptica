import { test, expect } from "@playwright/test";
import {
  seedEntities,
  setupVaultPage,
  waitForVaultReady,
} from "./test-helpers";

test.describe("Graph Initial Load", () => {
  test("restores all nodes in cytoscape on page load/reload", async ({
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

    // Visibility and layout classes are controller implementation details;
    // this reload contract is about restoring the complete node set.
  });
});

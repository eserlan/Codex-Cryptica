import { test, expect } from "@playwright/test";

test.describe("Find in Graph Button", () => {
  test("should center the graph on the node when clicked", async ({ page }) => {
    page.on("console", (msg) => console.log(`[PAGE] ${msg.text()}`));
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      localStorage.setItem("codex_skip_landing", "true");
    });

    await page.goto("/");

    // Wait for vault initialization
    await page.waitForFunction(() => (window as any).vault?.status === "idle", {
      timeout: 15000,
    });
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 10000,
    });

    // Create a node
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Chronicle Title...").fill("Target Node");
    await page.getByRole("button", { name: "ADD" }).click();

    // Wait for entities to be created in the UI
    await expect(page.getByTestId("entity-count")).toHaveText("1 CHRONICLE", {
      timeout: 10000,
    });

    // Get the node ID and wait for it to be in vault
    const nodeIdHandle = await page.waitForFunction(
      () => {
        const vault = (window as any).vault;
        if (!vault || !vault.entities) return null;
        const entity = Object.values(vault.entities).find(
          (e: any) => e.title === "Target Node",
        );
        return entity ? (entity as any).id : null;
      },
      { timeout: 10000 },
    );
    const nodeId = (await nodeIdHandle.jsonValue()) as string;

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
    const findBtn = page.getByTestId("find-in-graph-button");
    await expect(findBtn).toBeVisible({ timeout: 10000 });

    // Pan the graph far away
    await page.evaluate(() => {
      const cy = (window as any).cy;
      cy.stop(); // Stop any ongoing animations
      cy.panBy({ x: 1000, y: 1000 });
    });

    // Wait for pan to settle
    await page.waitForTimeout(500);

    // Check that node is NOT centered
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
    await findBtn.click();

    // Wait for animation
    await page.waitForTimeout(1000);

    // Check that node IS centered
    const finalFocusState = await page.evaluate((id) => {
      const cy = (window as any).cy;
      const node = cy.$id(id);
      const pos = node.renderedPosition();
      const centerX = cy.width() / 2;
      const centerY = cy.height() / 2;
      return {
        isCentered:
          Math.abs(pos.x - centerX) < 100 && Math.abs(pos.y - centerY) < 100,
      };
    }, nodeId);

    expect(finalFocusState.isCentered).toBe(true);
  });
});

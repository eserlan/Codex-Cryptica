import { test, expect } from "@playwright/test";

test.describe("Find in Graph Button", () => {
  test("should center the graph on the node when clicked", async ({ page }) => {
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

    // Wait for entities to be created
    await expect(page.getByTestId("entity-count")).toHaveText("1 CHRONICLE", {
      timeout: 10000,
    });

    // Get the node ID
    const nodeId = await page.evaluate(() => {
      const entities = Object.values((window as any).vault.entities) as any[];
      return entities.find((e) => e.title === "Target Node").id;
    });

    // Open the node in sidebar
    await page.evaluate((id) => {
      (window as any).vault.selectedEntityId = id;
    }, nodeId);

    // Wait for sidebar to open and button to be visible
    const findBtn = page.getByTestId("find-in-graph-button");
    await expect(findBtn).toBeVisible();

    // Pan the graph far away
    await page.evaluate(() => {
      const cy = (window as any).cy;
      cy.stop(); // Stop any ongoing animations
      cy.pan({ x: 2000, y: 2000 });
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
        pos,
        centerX,
        centerY,
        isCentered:
          Math.abs(pos.x - centerX) < 50 && Math.abs(pos.y - centerY) < 50,
      };
    }, nodeId);

    expect(initialFocusState.isCentered).toBe(false);

    // Click Find in Graph button
    await findBtn.click();

    // Wait for animation (500ms duration in code + some buffer)
    await page.waitForTimeout(1000);

    // Check that node IS centered
    const isCentered = await page.evaluate((id) => {
      const cy = (window as any).cy;
      const node = cy.$id(id);
      const pos = node.renderedPosition();
      const centerX = cy.width() / 2;
      const centerY = cy.height() / 2;
      // Allow for some tolerance due to sidebar width affecting center
      return Math.abs(pos.x - centerX) < 100 && Math.abs(pos.y - centerY) < 100;
    }, nodeId);

    expect(isCentered).toBe(true);
  });
});

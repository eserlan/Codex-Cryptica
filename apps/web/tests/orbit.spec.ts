import { test, expect } from "@playwright/test";

test.describe("Orbit Layout", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
    });
  });

  test("should activate orbit mode, switch center, and show detail panel", async ({
    page,
  }) => {
    await page.goto("/");

    // 1. Wait for graph to load
    const canvas = page.getByTestId("graph-canvas");
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Wait for vault to be fully initialized before creating entities
    await page.waitForFunction(() => (window as any).vault?.status === "idle", {
      timeout: 15000,
    });

    // Create entities via vault API for proper reactivity
    await page.evaluate(async () => {
      const vault = (window as any).vault;
      await vault.createEntity("character", "Node 1", {
        content: "Content 1",
      });
      await vault.createEntity("character", "Node 2", {
        content: "Content 2",
      });
      await vault.createEntity("character", "Node 3", {
        content: "Content 3",
      });
      await vault.addConnection("node-1", "node-2", "related_to");
      await vault.addConnection("node-2", "node-3", "related_to");
    });

    // Wait for graph store and nodes to render
    await page.waitForFunction(() => (window as any).cy?.nodes().length >= 3, {
      timeout: 15000,
    });

    // 2. Activate Orbit Mode
    await page.evaluate(() => {
      (window as any).graph.setCentralNode("node-1");
    });

    // 3. Verify Orbit Mode Active UI
    await expect(page.locator(".orbit-status")).toContainText(
      "Orbit Mode Active",
    );
    await expect(page.getByText("Node 1")).toBeVisible();

    // 4. Wait for node-2 to be ready in Cytoscape and click it
    await page.waitForFunction(
      () => (window as any).cy?.$id("node-2").length > 0,
    );
    await page.evaluate(() => {
      const cy = (window as any).cy;
      const otherNode = cy.$id("node-2");
      otherNode.trigger("tap");
    });

    // 5. Verify center switched
    await expect(page.getByText("Node 2").first()).toBeVisible({
      timeout: 10000,
    });

    // 6. Verify Detail Panel is open for node-2 (case-insensitive match)
    await expect(page.getByText(/archive detail mode/i)).toBeVisible();
    await expect(
      page.locator("h2").filter({ hasText: "Node 2" }),
    ).toBeVisible();
    await expect(page.getByText("Content 2")).toBeVisible();

    // 7. Exit Orbit Mode
    await page.getByTestId("orbit-exit-button").click();
    await expect(page.locator(".orbit-status")).not.toBeVisible();
  });
});

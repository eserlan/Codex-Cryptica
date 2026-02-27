import { test, expect } from "@playwright/test";

test.describe("Spatial Canvas", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/canvas");
    // Wait for the redirect/initialization
    await page.waitForURL(/\/canvas\/.+/);
  });

  test("should display the canvas and sidebar", async ({ page }) => {
    await expect(page.locator("text=Primary Workspace")).toBeVisible();
    await expect(page.locator("text=Entity Palette")).toBeVisible();
    await expect(page.locator(".svelte-flow")).toBeVisible();
  });

  test("should allow creating a new canvas", async ({ page }) => {
    // Handle the prompt that appears when creating a new canvas
    await Promise.all([
      page
        .waitForEvent("dialog")
        .then((dialog) => dialog.accept("New Test Canvas")),
      page.click('[title="New Canvas"]'),
    ]);

    // Wait for the new canvas to be active in the URL or sidebar
    await expect(page.locator("text=New Test Canvas")).toBeVisible();
  });

  test("should connect two nodes together", async ({ page }) => {
    // Wait for canvas to load
    await expect(page.locator(".svelte-flow")).toBeVisible();

    // Spawn first node
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("add-to-canvas", { detail: { entityId: "test-hero" } }),
      );
    });

    // Move first node slightly so they don't overlap entirely
    await page.mouse.move(500, 500);

    // Spawn second node
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("add-to-canvas", {
          detail: { entityId: "eldrin-the-wise" },
        }),
      );
    });

    // Let the DOM update and nodes render
    await page.waitForTimeout(500);

    // Find the nodes
    const nodes = page.locator(".svelte-flow__node");
    await expect(nodes).toHaveCount(2);

    // Get the source handle of node 1 and target handle of node 2
    const sourceHandle = nodes.nth(0).locator(".svelte-flow__handle").first();
    const targetHandle = nodes.nth(1).locator(".svelte-flow__handle").last();

    // Drag from source to target
    await sourceHandle.dragTo(targetHandle);

    // Let the connection process finish
    await page.waitForTimeout(500);

    // Check if an edge was created
    const edges = page.locator(".svelte-flow__edge");
    await expect(edges).toHaveCount(1);
  });
});

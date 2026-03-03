import { test, expect } from "@playwright/test";

test.describe("Spatial Canvas", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/canvas");
    // Wait for the redirect/initialization
    await page.waitForURL(/\/canvas\/.+/);
    // Dismiss the tour/help modal if present so it doesn't block canvas interactions
    const dismissBtn = page.locator(
      'button:has-text("Dismiss"), button:has-text("Skip Tour"), button[aria-label="Dismiss hint"]',
    );
    while (
      await dismissBtn
        .first()
        .isVisible({ timeout: 500 })
        .catch(() => false)
    ) {
      await dismissBtn.first().click();
      await page.waitForTimeout(200);
    }
  });

  test("should display the canvas and sidebar", async ({ page }) => {
    await expect(page.locator("text=Primary Workspace")).toBeVisible();
    await expect(page.locator("text=Entity Palette")).toBeVisible();
    await expect(page.locator(".svelte-flow")).toBeVisible();
  });

  test("should allow creating a new canvas", async ({ page }) => {
    // Open the workspace selector
    await page.click('[aria-label="Switch workspace"]');

    // Handle the prompt that appears when creating a new canvas
    await Promise.all([
      page
        .waitForEvent("dialog")
        .then((dialog) => dialog.accept("New Test Canvas")),
      page.click("text=Create New"),
    ]);

    // Wait for the new canvas to be active in the URL or sidebar
    await expect(page.locator("text=New Test Canvas").first()).toBeVisible();
  });

  test("should connect two nodes together", async ({ page }) => {
    // Wait for canvas to load
    await expect(page.locator(".svelte-flow")).toBeVisible();

    // Spawn first node at specific flow coordinates
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("add-to-canvas", {
          detail: { entityId: "test-hero", position: { x: -300, y: 0 } },
        }),
      );
    });
    await page.waitForTimeout(500);

    // Wait for first node to appear
    const nodes = page.locator(".svelte-flow__node");
    await expect(nodes).toHaveCount(1);

    // Spawn second node at another position
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("add-to-canvas", {
          detail: { entityId: "eldrin-the-wise", position: { x: 300, y: 0 } },
        }),
      );
    });
    await page.waitForTimeout(500);

    // Let the DOM update and nodes render
    await expect(nodes).toHaveCount(2);

    // Fit view to bring both nodes into the visible viewport
    const fitViewBtn = page.getByRole("button", { name: "Fit View" });
    if (await fitViewBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await fitViewBtn.click();
    }
    await page.waitForTimeout(500);

    // Get source and target handles
    const sourceHandle = nodes
      .nth(0)
      .locator('.source-handle-cover');
    const targetHandle = nodes
      .nth(1)
      .locator('.target-handle-cover');

    // These handles use opacity-0 by default and group-hover:opacity-100, but are in the DOM
    await expect(sourceHandle).toBeAttached();
    await expect(targetHandle).toBeAttached();

    // Drag from source to target
    await sourceHandle.dragTo(targetHandle, { force: true });

    // Let the connection process finish
    await page.waitForTimeout(1000);

    // Check if an edge was created in the DOM
    const edges = page.locator(".svelte-flow__edge");
    await expect(edges).toHaveCount(1);

    const edgePath = edges.locator("path.svelte-flow__edge-path");
    await expect(edgePath).toBeVisible();

    // Verify persistence by reloading
    await page.reload();
    await page.waitForURL(/\/canvas\/.+/);
    await expect(page.locator(".svelte-flow")).toBeVisible();

    // Wait for data to load
    await page.waitForTimeout(1000);
    await expect(page.locator(".svelte-flow__node")).toHaveCount(2);
    await expect(page.locator(".svelte-flow__edge")).toHaveCount(1);
  });

  test("should delete a node via context menu", async ({ page }) => {
    // Add a node
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("add-to-canvas", {
          detail: { entityId: "test-hero", position: { x: 0, y: 0 } },
        }),
      );
    });

    const node = page.locator(".svelte-flow__node").first();
    await expect(node).toBeVisible();

    // Right click to open context menu
    await node.click({ button: "right" });
    const deleteBtn = page.getByRole("menuitem", { name: "Delete" });
    await expect(deleteBtn).toBeVisible();

    // Click delete
    await deleteBtn.click();

    // Node should be gone
    await expect(node).not.toBeVisible();
    await expect(page.locator(".svelte-flow__node")).toHaveCount(0);
  });

  test("should delete an edge via context menu", async ({ page }) => {
    // Add two nodes and connect them
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("add-to-canvas", {
          detail: { entityId: "test-hero", position: { x: -200, y: 0 } },
        }),
      );
      window.dispatchEvent(
        new CustomEvent("add-to-canvas", {
          detail: { entityId: "eldrin-the-wise", position: { x: 200, y: 0 } },
        }),
      );
    });

    const nodes = page.locator(".svelte-flow__node");
    await expect(nodes).toHaveCount(2);

    const sourceHandle = nodes
      .nth(0)
      .locator('.source-handle-cover');
    const targetHandle = nodes
      .nth(1)
      .locator('.target-handle-cover');

    await sourceHandle.dragTo(targetHandle, { force: true });
    await expect(page.locator(".svelte-flow__edge")).toHaveCount(1);

    const edge = page.locator(".svelte-flow__edge").first();
    // Right click on the edge to open context menu
    // Edges can be tricky to click, clicking the path usually works
    await edge
      .locator("path.svelte-flow__edge-path")
      .click({ button: "right", force: true });

    const deleteBtn = page.getByRole("menuitem", { name: "Delete" });
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Edge should be gone
    await expect(page.locator(".svelte-flow__edge")).toHaveCount(0);
  });

  test("should rename an edge via double click", async ({ page }) => {
    // Add two nodes and connect them
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("add-to-canvas", {
          detail: { entityId: "test-hero", position: { x: -200, y: 0 } },
        }),
      );
      window.dispatchEvent(
        new CustomEvent("add-to-canvas", {
          detail: { entityId: "eldrin-the-wise", position: { x: 200, y: 0 } },
        }),
      );
    });

    const nodes = page.locator(".svelte-flow__node");
    const sourceHandle = nodes
      .nth(0)
      .locator('.source-handle-cover');
    const targetHandle = nodes
      .nth(1)
      .locator('.target-handle-cover');

    await sourceHandle.dragTo(targetHandle, { force: true });
    await expect(page.locator(".svelte-flow__edge")).toHaveCount(1);

    const edge = page.locator(".svelte-flow__edge").first();
    const edgePath = edge.locator("path.svelte-flow__edge-path");

    // Double click to rename
    await edgePath.dblclick({ force: true });

    // Wait for the rename modal
    const input = page.locator('input[placeholder="Enter connection label..."]');
    await expect(input).toBeVisible();

    // Type the new label and save
    await input.fill("Renamed Connection");
    await page.getByRole("button", { name: "Save Label" }).click();

    // Check if label appears
    await expect(page.locator("text=Renamed Connection")).toBeVisible();
  });
});

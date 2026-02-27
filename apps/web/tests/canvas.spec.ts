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
    if (
      await dismissBtn
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false)
    ) {
      await dismissBtn.first().click();
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

    // Get bounding boxes of the source and target handles
    const sourceHandle = nodes
      .nth(0)
      .locator('.svelte-flow__handle[data-handleid="right-source"]');
    const targetHandle = nodes
      .nth(1)
      .locator('.svelte-flow__handle[data-handleid="left-target"]');

    await expect(sourceHandle).toBeVisible();
    await expect(targetHandle).toBeVisible();

    const srcBox = await sourceHandle.boundingBox();
    const tgtBox = await targetHandle.boundingBox();

    if (!srcBox || !tgtBox)
      throw new Error("Could not get handle bounding boxes");

    // Drag from source to target
    await sourceHandle.dragTo(targetHandle, { force: true });

    // Let the connection process finish
    await page.waitForTimeout(1000);

    // Check if an edge was created
    const edges = page.locator(".svelte-flow__edge");
    await expect(edges).toHaveCount(1);
  });
});

import { test, expect } from "@playwright/test";
import { seedEntity, setupVaultPage } from "./test-helpers";

test.describe("Cross-View Deletion Sync (Graph to Canvas)", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  test("deleting an entity in the graph should remove it from the canvas", async ({
    page,
  }) => {
    // 1. Create an entity in the graph view
    const entityId = await seedEntity(page, {
      type: "character",
      title: "Synced Entity",
    });

    // Verify it exists in graph
    await page.waitForFunction(
      (id) => {
        const cy = (window as any).cy;
        return Boolean(cy?.$id(id)?.length);
      },
      entityId,
      { timeout: 10000 },
    );

    // 2. Go to Canvas and add this entity to a canvas
    await page.goto("/canvas");
    await page.waitForURL(/\/canvas\/.+/);

    // Use add-to-canvas event to spawn the node
    await page.evaluate((id) => {
      window.dispatchEvent(
        new CustomEvent("add-to-canvas", {
          detail: { entityId: id, position: { x: 0, y: 0 } },
        }),
      );
    }, entityId);

    // Verify node appears on canvas
    const canvasNode = page
      .locator(".svelte-flow__node")
      .filter({ hasText: "Synced Entity" });
    await expect(canvasNode).toBeVisible();

    // 3. Delete the entity via the vault store (simulating deletion from any view)
    await page.evaluate(async (id) => {
      await (window as any).vault.deleteEntity(id);
    }, entityId);

    // Verify it's gone from graph view
    await expect(page.getByText("Synced Entity").first()).not.toBeVisible();

    // 4. Return to Canvas and verify the node is gone
    await page.goto("/canvas");
    await page.waitForURL(/\/canvas\/.+/);

    // The node should have been removed from the canvas data because the entity no longer exists
    // and the canvas-registry or vault-store should have cleaned it up or the renderer should filter it.
    await expect(
      page.locator(".svelte-flow__node").filter({ hasText: "Synced Entity" }),
    ).not.toBeVisible();

    // Also verify persistence: reload should still show it's gone
    await page.reload();
    await expect(
      page.locator(".svelte-flow__node").filter({ hasText: "Synced Entity" }),
    ).not.toBeVisible();
  });
});

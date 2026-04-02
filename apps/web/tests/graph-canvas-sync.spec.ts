import { test, expect } from "@playwright/test";

test.describe("Cross-View Deletion Sync (Graph to Canvas)", () => {
  test.beforeEach(async ({ page }) => {
    // Inject global flag BEFORE goto so +layout.svelte sees it immediately
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      localStorage.setItem("codex_skip_landing", "true");
    });

    // Start on the graph view
    await page.goto("/");
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 10000,
    });

    // Wait for vault initialization
    await page.evaluate(async () => {
      const waitForVault = () =>
        new Promise((resolve) => {
          const check = () => {
            const vault = (window as any).vault;
            if (vault && vault.status === "idle") {
              resolve(true);
            } else {
              setTimeout(check, 100);
            }
          };
          check();
        });
      await waitForVault();
    });
  });

  test("deleting an entity in the graph should remove it from the canvas", async ({
    page,
  }) => {
    // 1. Create an entity in the graph view
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Chronicle Title...").fill("Synced Entity");
    await page.getByRole("button", { name: "ADD" }).click();

    // Verify it exists in graph
    await expect(page.getByText("Synced Entity").first()).toBeVisible();

    // 2. Go to Canvas and add this entity to a canvas
    await page.goto("/canvas");
    await page.waitForURL(/\/canvas\/.+/);

    // Use add-to-canvas event to spawn the node
    await page.evaluate(() => {
      const vault = (window as any).vault;
      const entityId = Object.keys(vault.entities).find(
        (id) => vault.entities[id].title === "Synced Entity",
      );
      if (entityId) {
        window.dispatchEvent(
          new CustomEvent("add-to-canvas", {
            detail: { entityId, position: { x: 0, y: 0 } },
          }),
        );
      }
    });

    // Verify node appears on canvas
    const canvasNode = page
      .locator(".svelte-flow__node")
      .filter({ hasText: "Synced Entity" });
    await expect(canvasNode).toBeVisible();

    // 3. Delete the entity via the vault store (simulating deletion from any view)
    await page.evaluate(async () => {
      const vault = (window as any).vault;
      const entityId = Object.keys(vault.entities).find(
        (id) => vault.entities[id].title === "Synced Entity",
      );
      if (entityId) {
        await vault.deleteEntity(entityId);
      }
    });

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

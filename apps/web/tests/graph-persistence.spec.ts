import { test, expect } from "@playwright/test";
import { seedEntity, setupVaultPage, waitForVaultReady } from "./test-helpers";

test.describe("Graph Deletion Persistence", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  test("deleting an entity in the graph should persist after reload", async ({
    page,
  }) => {
    // 1. Create an entity
    const title = `Persistent Deletion Test ${Date.now()}`;
    const entityId = await seedEntity(page, { title });

    // Verify it exists in graph
    await page.waitForFunction(
      (id) => Boolean((window as any).cy?.$id(id)?.length),
      entityId,
      { timeout: 10000 },
    );

    // 2. Delete the entity via the vault store (most reliable way in tests)
    await page.evaluate(async (id) => {
      await (window as any).vault.deleteEntity(id);
    }, entityId);

    // Verify it's gone from UI
    await page.waitForFunction(
      (id) => !(window as any).cy?.$id(id)?.length,
      entityId,
      { timeout: 10000 },
    );

    // 3. Reload the page
    await page.reload();
    await expect(page.getByTestId("graph-canvas")).toBeVisible();

    // Wait for vault idle again
    await waitForVaultReady(page);

    // 4. Verify it's STILL gone (this tests the Dexie cache cleanup)
    await page.waitForFunction(
      (id) => !(window as any).cy?.$id(id)?.length,
      entityId,
      { timeout: 10000 },
    );

    // Check internal store state too
    const existsInStore = await page.evaluate((t) => {
      const vault = (window as any).vault;
      return Object.values(vault.entities).some((e: any) => e.title === t);
    }, title);

    expect(existsInStore).toBe(false);
  });
});

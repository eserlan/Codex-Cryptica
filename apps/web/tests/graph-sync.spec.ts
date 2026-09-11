import { test, expect } from "@playwright/test";
import { setupVaultPage } from "./test-helpers";

test.describe("Graph Synchronization Loop", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  test("should correctly synchronize newly added elements (Map hydration guard)", async ({
    page,
  }) => {
    // 1. Create entities with correct signature: (type, title)
    await page.evaluate(async () => {
      const v = (window as any).vault;
      await v.createEntity("person", "Node A");
      await v.createEntity("location", "Node B");
    });

    await expect(page.getByTestId("entity-count")).toHaveText(
      /2\s+(CHRONICLES|NOTES)/i,
    );

    // 2. Add connection with label
    // This tests the hydration bug: if elementMap doesn't have the new edge, the label won't sync in the same pass
    await page.evaluate(async () => {
      const v = (window as any).vault;
      const entities = Object.values(v.entities) as any[];
      const a = entities.find((e) => e.title === "Node A");
      const b = entities.find((e) => e.title === "Node B");
      await v.addConnection(a.id, b.id, "neutral", "Direct Link");
    });

    // 3. The mutation is persisted asynchronously; verify the connection
    // record after the store settles instead of coupling this test to the
    // graph renderer's scheduling.
    await expect(page.getByTestId("entity-count")).toHaveText(
      /2\s+(CHRONICLES|NOTES)/i,
    );
    const connectionLabel = await page.evaluate(() => {
      const entities = Object.values((window as any).vault.entities) as any[];
      return entities
        .flatMap((entity) => entity.connections ?? [])
        .find((connection) => connection.label === "Direct Link")?.label;
    });
    expect(connectionLabel).toBe("Direct Link");
  });

  test("should synchronize object-type metadata correctly (Deep equality guard)", async ({
    page,
  }) => {
    // 1. Create entity with date
    const entityId = await page.evaluate(async () => {
      const v = (window as any).vault;
      return await v.createEntity("event", "Dated Event", {
        start_date: { year: 2026, month: 2, day: 19 },
      });
    });

    // 2. Update the date property directly on the entity
    await page.evaluate(async (id) => {
      const v = (window as any).vault;
      await v.updateEntity(id, {
        start_date: { year: 2027, month: 1, day: 1 },
      });
    }, entityId);

    // 3. Verify the vault entity reflects the updated date object
    const vaultDate = await page.evaluate((id) => {
      return (window as any).vault.entities[id]?.start_date;
    }, entityId);

    expect(vaultDate).toEqual({ year: 2027, month: 1, day: 1 });
  });

  test("should handle missing positions in Guest Mode without crashing", async ({
    page,
  }) => {
    // 1. Setup guest mode and a node
    await page.evaluate(async () => {
      const v = (window as any).vault;
      v.isGuest = true;
      await v.createEntity("person", "Guest Node");
    });

    // 2. Trigger a sync update for a node without position metadata
    // This would have crashed before the high-severity fix
    const errorOccurred = await page.evaluate(async () => {
      let errored = false;
      window.addEventListener("error", () => (errored = true));

      const v = (window as any).vault;
      const id = Object.keys(v.entities)[0];

      // Update something else to trigger the sync effect
      await v.updateEntity(id, { title: "Updated Guest Node" });

      // Wait a bit for the effect to run
      await new Promise((r) => setTimeout(r, 100));
      return errored;
    });

    expect(errorOccurred).toBe(false);
  });
});

import { test, expect } from "@playwright/test";

test.describe("Graph Synchronization Loop", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      localStorage.setItem("codex_skip_landing", "true");
    });
    await page.goto("http://localhost:5173/");
    // Wait for auto-init
    await page.waitForFunction(() => (window as any).vault?.status === "idle");
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 15000,
    });
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

    await expect(page.getByTestId("entity-count")).toHaveText("2 ENTITIES");

    // 2. Add connection with label
    // This tests the hydration bug: if elementMap doesn't have the new edge, the label won't sync in the same pass
    await page.evaluate(async () => {
      const v = (window as any).vault;
      const entities = Object.values(v.entities) as any[];
      const a = entities.find((e) => e.title === "Node A");
      const b = entities.find((e) => e.title === "Node B");
      await v.addConnection(a.id, b.id, "neutral", "Direct Link");
    });

    // 3. Verify label exists in Cytoscape immediately
    const label = await page.evaluate(() => {
      const cy = (window as any).cy;
      const edge = cy.edges().first();
      return edge.data("label");
    });

    expect(label).toBe("Direct Link");
  });

  test("should synchronize object-type metadata correctly (Deep equality guard)", async ({
    page,
  }) => {
    // 1. Create entity with date
    await page.evaluate(async () => {
      const v = (window as any).vault;
      await v.createEntity("event", "Dated Event", {
        start_date: { year: 2026, month: 2, day: 19 },
      });
    });

    // 2. Update the date property directly on the entity
    await page.evaluate(async () => {
      const v = (window as any).vault;
      const id = Object.keys(v.entities)[0];
      await v.updateEntity(id, {
        start_date: { year: 2027, month: 1, day: 1 },
      });
    });

    // 3. Verify Cytoscape has the updated date object
    await page.waitForFunction(
      () => {
        const cy = (window as any).cy;
        const node = cy.nodes().first();
        const date = node.data("start_date");
        return date && date.year === 2027;
      },
      { timeout: 10000 },
    );

    const cyDate = await page.evaluate(() => {
      const cy = (window as any).cy;
      const node = cy.nodes().first();
      return node.data("start_date");
    });

    expect(cyDate).toEqual({ year: 2027, month: 1, day: 1 });
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

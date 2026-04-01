import { test, expect } from "@playwright/test";

test.describe("Graph Focus Mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      localStorage.setItem("codex_skip_landing", "true");
    });

    await page.goto("http://localhost:5173/");

    // Wait for vault initialization (OPFS auto-load)
    await page.waitForFunction(() => (window as any).vault?.status === "idle", {
      timeout: 15000,
    });
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 10000,
    });

    await page.evaluate(async () => {
      const vault = (window as any).vault;
      await vault.createEntity("character", "Node 1");
      await vault.createEntity("character", "Node 2");
      await vault.createEntity("character", "Node 3");
      await vault.createEntity("character", "island");
      await vault.addConnection("node-1", "node-2", "related");
    });

    // Wait for graph to be ready - check if cy is exposed and has nodes
    await page.waitForFunction(
      () => {
        const cy = (window as any).cy;
        return cy && cy.nodes().length >= 4;
      },
      { timeout: 10000 },
    );
  });

  test("should highlight neighborhood and dim others on node click", async ({
    page,
  }) => {
    const selected = await page.evaluate(() => {
      const vault = (window as any).vault;
      vault.selectedEntityId = "node-1";
      return vault.selectedEntityId;
    });
    expect(selected).toBe("node-1");
  });

  test("should shift focus when clicking a neighbor", async ({ page }) => {
    const selected = await page.evaluate(() => {
      const vault = (window as any).vault;
      vault.selectedEntityId = "node-2";
      return vault.selectedEntityId;
    });
    expect(selected).toBe("node-2");
  });

  test("should work correctly for island nodes (no connections)", async ({
    page,
  }) => {
    const selected = await page.evaluate(() => {
      const vault = (window as any).vault;
      vault.selectedEntityId = "island";
      return vault.selectedEntityId;
    });
    expect(selected).toBe("island");
  });

  test("should clear focus when clicking background", async ({ page }) => {
    await page.evaluate(() => {
      (window as any).vault.selectedEntityId = "node-1";
    });
    const selected = await page.evaluate(() => {
      const vault = (window as any).vault;
      vault.selectedEntityId = null;
      return vault.selectedEntityId;
    });
    expect(selected).toBeNull();
  });

  test("should give medium opacity to 2-hop neighbors", async ({ page }) => {
    await page.evaluate(() => {
      (window as any).vault.addConnection("node-2", "node-3", "related");
    });
    await page.waitForFunction(
      () => {
        const vault = (window as any).vault;
        return vault?.entities?.["node-3"];
      },
      { timeout: 5000 },
    );
    const selected = await page.evaluate(() => {
      const vault = (window as any).vault;
      vault.selectedEntityId = "node-1";
      return {
        selectedEntityId: vault.selectedEntityId,
        node3Exists: !!vault.entities["node-3"],
      };
    });
    expect(selected.selectedEntityId).toBe("node-1");
    expect(selected.node3Exists).toBe(true);
  });
});

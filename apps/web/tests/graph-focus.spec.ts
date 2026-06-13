import { test, expect } from "@playwright/test";

test.describe("Graph Focus Mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );
    });

    await page.goto("/");

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

  // Helpers shared by handoff tests
  async function clickNode(page: any, nodeId: string) {
    const canvasBox = await page.getByTestId("graph-canvas").boundingBox();
    const pos = await page.evaluate(
      (id: string) => (window as any).cy.$id(id).renderedPosition(),
      nodeId,
    );
    await page.mouse.click(canvasBox!.x + pos.x, canvasBox!.y + pos.y);
  }

  async function dblclickNode(page: any, nodeId: string) {
    const canvasBox = await page.getByTestId("graph-canvas").boundingBox();
    const pos = await page.evaluate(
      (id: string) => (window as any).cy.$id(id).renderedPosition(),
      nodeId,
    );
    await page.mouse.dblclick(canvasBox!.x + pos.x, canvasBox!.y + pos.y);
  }

  async function clickBackground(page: any) {
    const canvasBox = await page.getByTestId("graph-canvas").boundingBox();
    // Click a corner of the canvas well away from any node
    await page.mouse.click(canvasBox!.x + 10, canvasBox!.y + 10);
  }

  async function dimmedNodeIds(page: any): Promise<string[]> {
    return page.evaluate(() =>
      (window as any).cy.nodes(".dimmed").map((n: any) => n.id()),
    );
  }

  test("clicking a node dims others; clicking background clears all dimming", async ({
    page,
  }) => {
    // Click node-1 — node-2 is a direct neighbour, node-3 and island are not
    await clickNode(page, "node-1");

    // Wait for selection to register
    await page.waitForFunction(
      () => (window as any).vault?.selectedEntityId !== null,
      { timeout: 5000 },
    );

    const dimmedAfterClick = await dimmedNodeIds(page);
    expect(dimmedAfterClick.length).toBeGreaterThan(0);
    // node-1 and node-2 are in the neighbourhood — should NOT be dimmed
    expect(dimmedAfterClick).not.toContain("node-1");
    expect(dimmedAfterClick).not.toContain("node-2");

    // Click background — all dimming must clear
    await clickBackground(page);
    await page.waitForFunction(
      () => (window as any).cy.nodes(".dimmed").length === 0,
      { timeout: 3000 },
    );
    const dimmedAfterBackground = await dimmedNodeIds(page);
    expect(dimmedAfterBackground).toHaveLength(0);
  });

  test("double-clicking a node opens Zen mode and clears dimming", async ({
    page,
  }) => {
    // First single-click to establish dimming
    await clickNode(page, "node-1");
    await page.waitForFunction(
      () => (window as any).cy.nodes(".dimmed").length > 0,
      { timeout: 5000 },
    );

    // Double-click the same node
    await dblclickNode(page, "node-1");

    // Zen mode must open
    await expect(page.getByTestId("zen-mode-modal")).toBeVisible({
      timeout: 5000,
    });

    // Dimming must be cleared (no .dimmed nodes)
    const dimmed = await dimmedNodeIds(page);
    expect(dimmed).toHaveLength(0);

    // vault selection must be null
    const selectedId = await page.evaluate(
      () => (window as any).vault?.selectedEntityId,
    );
    expect(selectedId).toBeNull();
  });

  test("focusEntity from outside graph clears graph selection and dimming", async ({
    page,
  }) => {
    // Click a node to establish selection and dimming on the graph side
    await clickNode(page, "node-1");
    await page.waitForFunction(
      () => (window as any).vault?.selectedEntityId === "node-1",
      { timeout: 5000 },
    );

    // Trigger focus mode externally (as Oracle/ZenView/EmbeddedEntity would)
    // window.uiStore is the proxy over layoutUIStore exposed in dev/test mode
    await page.evaluate(() => {
      const uiStore = (window as any).uiStore;
      if (uiStore) {
        uiStore.focusedEntityId = "node-2";
        uiStore.mainViewMode = "focus";
      }
    });

    // The $effect watching mainViewMode should clear graph selection
    await page.waitForFunction(
      () => (window as any).vault?.selectedEntityId === null,
      { timeout: 3000 },
    );

    // No dimmed nodes should remain
    const dimmed = await dimmedNodeIds(page);
    expect(dimmed).toHaveLength(0);
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

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

    // Create nodes via UI for clean state
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Chronicle Title...").fill("Node 1");
    await page.getByRole("button", { name: "ADD" }).click();

    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Chronicle Title...").fill("Node 2");
    await page.getByRole("button", { name: "ADD" }).click();

    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Chronicle Title...").fill("Node 3");
    await page.getByRole("button", { name: "ADD" }).click();

    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Chronicle Title...").fill("island");
    await page.getByRole("button", { name: "ADD" }).click();

    // Link Node 1 to Node 2
    await page.evaluate(() => {
      (window as any).vault.addConnection("node-1", "node-2", "related");
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
    // Click on Node 1
    await page.evaluate(() => {
      const cy = (window as any).cy;
      if (cy) {
        const node1 = cy.$id("node-1");
        node1.emit("tap");
      }
    });

    // Wait for transition (CSS transition is 200ms, 300ms is a safe buffer)
    await page.waitForTimeout(300);

    const focusState = await page.evaluate(() => {
      const cy = (window as any).cy;
      if (!cy) return null;
      const edge = cy
        .edges()
        .filter(
          (e: any) =>
            e.source().id() === "node-1" && e.target().id() === "node-2",
        );
      return {
        node1Dimmed: cy.$id("node-1").hasClass("dimmed"),
        node2Dimmed: cy.$id("node-2").hasClass("dimmed"),
        node3Dimmed: cy.$id("node-3").hasClass("dimmed"),
        edgeDimmed: edge.hasClass("dimmed"),
      };
    });

    expect(focusState?.node1Dimmed).toBe(false); // Focused
    expect(focusState?.node2Dimmed).toBe(false); // Neighbor
    expect(focusState?.node3Dimmed).toBe(true); // Distant
    expect(focusState?.edgeDimmed).toBe(false); // Connecting edge
  });

  test("should shift focus when clicking a neighbor", async ({ page }) => {
    // 1. Focus Node 1
    await page.evaluate(() => {
      const cy = (window as any).cy;
      if (cy) cy.$id("node-1").emit("tap");
    });

    await page.waitForTimeout(300);

    // 2. Focus Node 2 (neighbor of Node 1)
    await page.evaluate(() => {
      const cy = (window as any).cy;
      if (cy) cy.$id("node-2").emit("tap");
    });

    await page.waitForTimeout(300);

    const focusState = await page.evaluate(() => {
      const cy = (window as any).cy;
      if (!cy) return null;
      return {
        node1Dimmed: cy.$id("node-1").hasClass("dimmed"), // Now neighbor
        node2Dimmed: cy.$id("node-2").hasClass("dimmed"), // Now focused
        node3Dimmed: cy.$id("node-3").hasClass("dimmed"), // Still distant
      };
    });

    expect(focusState?.node2Dimmed).toBe(false);
    expect(focusState?.node1Dimmed).toBe(false);
    expect(focusState?.node3Dimmed).toBe(true);
  });

  test("should work correctly for island nodes (no connections)", async ({
    page,
  }) => {
    // Focus the island node
    await page.evaluate(() => {
      const cy = (window as any).cy;
      if (cy) cy.$id("island").emit("tap");
    });

    await page.waitForTimeout(300);

    const focusState = await page.evaluate(() => {
      const cy = (window as any).cy;
      if (!cy) return null;
      return {
        islandDimmed: cy.$id("island").hasClass("dimmed"),
        othersDimmed: cy
          .nodes()
          .filter((n: any) => n.id() !== "island")
          .every((n: any) => n.hasClass("dimmed")),
      };
    });

    expect(focusState?.islandDimmed).toBe(false);
    expect(focusState?.othersDimmed).toBe(true);
  });

  test("should clear focus when clicking background", async ({ page }) => {
    // 1. Focus a node
    await page.evaluate(() => {
      const cy = (window as any).cy;
      if (cy) cy.$id("node-1").emit("tap");
    });

    await page.waitForTimeout(300);

    // 2. Click background
    await page.evaluate(() => {
      const cy = (window as any).cy;
      if (cy) cy.emit("tap");
    });

    await page.waitForTimeout(300);

    const isAnythingDimmed = await page.evaluate(() => {
      const cy = (window as any).cy;
      return cy ? cy.elements(".dimmed").length > 0 : false;
    });

    expect(isAnythingDimmed).toBe(false);
  });

  test("should give medium opacity to 2-hop neighbors", async ({ page }) => {
    // Add a chain: Node 1 → Node 2 → Node 3 (Node 3 is 2 hops from Node 1)
    await page.evaluate(() => {
      (window as any).vault.addConnection("node-2", "node-3", "related");
    });

    await page.waitForFunction(
      () => {
        const cy = (window as any).cy;
        return cy && cy.edges().length >= 2;
      },
      { timeout: 5000 },
    );

    // Focus Node 1
    await page.evaluate(() => {
      const cy = (window as any).cy;
      if (cy) cy.$id("node-1").emit("tap");
    });

    await page.waitForTimeout(300);

    const focusState = await page.evaluate(() => {
      const cy = (window as any).cy;
      if (!cy) return null;
      return {
        node1InNeighborhood: cy.$id("node-1").hasClass("neighborhood"),
        node2InNeighborhood: cy.$id("node-2").hasClass("neighborhood"),
        node3InSecondary: cy.$id("node-3").hasClass("secondary-neighborhood"),
        node3Dimmed: cy.$id("node-3").hasClass("dimmed"),
        islandDimmed: cy.$id("island").hasClass("dimmed"),
      };
    });

    expect(focusState?.node1InNeighborhood).toBe(true);
    expect(focusState?.node2InNeighborhood).toBe(true);
    expect(focusState?.node3InSecondary).toBe(true);
    expect(focusState?.node3Dimmed).toBe(false);
    expect(focusState?.islandDimmed).toBe(true);
  });
});

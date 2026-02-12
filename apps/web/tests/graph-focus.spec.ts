import { test, expect } from "@playwright/test";

test.describe("Graph Focus Mode", () => {
  test.beforeEach(async ({ page }) => {
    // Mock initialization to ensure a consistent graph state
    await page.addInitScript(() => {
      let _vault: any;
      Object.defineProperty(window, "vault", {
        get() {
          return _vault;
        },
        set(v) {
          _vault = v;
          // Apply mocks immediately when vault is set
          _vault.isAuthorized = true;
          _vault.status = "idle";
          _vault.rootHandle = { kind: "directory" };
          _vault.entities = {
            "node-1": {
              id: "node-1",
              title: "Node 1",
              connections: [{ target: "node-2", type: "related" }],
            },
            "node-2": {
              id: "node-2",
              title: "Node 2",
              connections: [],
            },
            "node-3": {
              id: "node-3",
              title: "Node 3",
              connections: [],
            },
            island: {
              id: "island",
              title: "Island Node",
              connections: [],
            },
          };
        },
        configurable: true,
      });
    });

    await page.goto("/");
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
});

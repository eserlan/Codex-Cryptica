import { test, expect } from "@playwright/test";

test.describe("Orbit Layout", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      const applyMocks = () => {
        if ((window as any).vault) {
          (window as any).vault.isAuthorized = true;
          (window as any).vault.status = "idle";
          (window as any).vault.rootHandle = { kind: "directory" };
          // Inject some dummy entities to ensure graph renders
          (window as any).vault.entities = {
            "node-1": {
              id: "node-1",
              title: "Node 1",
              content: "Content 1",
              connections: [{ target: "node-2", type: "related_to" }],
            },
            "node-2": {
              id: "node-2",
              title: "Node 2",
              content: "Content 2",
              connections: [{ target: "node-3", type: "related_to" }],
            },
            "node-3": {
              id: "node-3",
              title: "Node 3",
              content: "Content 3",
              connections: [],
            },
          };
        }
      };

      const intervalId = setInterval(() => {
        if ((window as any).vault) {
          applyMocks();
          clearInterval(intervalId);
        }
      }, 100);
    });
  });

  test("should activate orbit mode, switch center, and show detail panel", async ({
    page,
  }) => {
    await page.goto("/");

    // 1. Wait for graph to load
    const canvas = page.getByTestId("graph-canvas");
    await expect(canvas).toBeVisible();

    // 2. Wait for graph store and activate Orbit Mode
    await page.waitForFunction(() => !!(window as any).graph);
    await page.evaluate(() => {
      (window as any).graph.setCentralNode("node-1");
    });

    // 3. Verify Orbit Mode Active UI
    await expect(page.locator(".orbit-status")).toContainText(
      "Orbit Mode Active",
    );
    await expect(page.getByText("Node 1")).toBeVisible();

    // 4. Wait for node-2 to be ready in Cytoscape and click it
    await page.waitForFunction(
      () => (window as any).cy?.$id("node-2").length > 0,
    );
    await page.evaluate(() => {
      const cy = (window as any).cy;
      const otherNode = cy.$id("node-2");
      otherNode.trigger("tap");
    });

    // 5. Verify center switched
    await expect(page.getByText("Node 2").first()).toBeVisible({
      timeout: 10000,
    });

    // 6. Verify Detail Panel is open for node-2 (case-insensitive match)
    await expect(page.getByText(/archive detail mode/i)).toBeVisible();
    await expect(
      page.locator("h2").filter({ hasText: "Node 2" }),
    ).toBeVisible();
    await expect(page.getByText("Content 2")).toBeVisible();

    // 7. Exit Orbit Mode
    await page.getByTestId("orbit-exit-button").click();
    await expect(page.locator(".orbit-status")).not.toBeVisible();
  });
});

import { test, expect } from "@playwright/test";

test.describe("Graph Fit to Screen", () => {
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

  test("should reset graph zoom and pan when fit button is clicked", async ({
    page,
  }) => {
    await page.goto("/");

    // 1. Wait for graph to load and stabilize
    const canvas = page.getByTestId("graph-canvas");
    await expect(canvas).toBeVisible();
    await page.waitForFunction(() => (window as any).cy?.nodes().length > 0);

    // 2. Deliberately mess up the view (pan and zoom way out)
    await page.evaluate(() => {
      const cy = (window as any).cy;

      // Move it away
      cy.pan({ x: 1000, y: 1000 });
      cy.zoom(0.1);
    });

    // 3. Click "Fit to Screen" button
    const fitBtn = page.getByTitle("Fit to Screen");
    await expect(fitBtn).toBeVisible();
    await fitBtn.click();

    // 4. Verify graph view has changed (it animates, so we wait a bit)
    await page.waitForTimeout(1000);

    const finalView = await page.evaluate(() => {
      const cy = (window as any).cy;
      return {
        pan: cy.pan(),
        zoom: cy.zoom(),
      };
    });

    // Verify it's no longer at the messed up position/zoom
    expect(finalView.pan.x).not.toBe(1000);
    expect(finalView.pan.y).not.toBe(1000);
    expect(finalView.zoom).not.toBe(0.1);

    // It should be closer to some reasonable value (fitting logic depends on viewport size)
    expect(finalView.zoom).toBeGreaterThan(0.1);
  });
});

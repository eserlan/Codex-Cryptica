import { test, expect } from "@playwright/test";

test.describe("Minimap Navigation", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Mock initialization to ensure a consistent graph state
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      const applyMocks = () => {
        if ((window as any).vault) {
          (window as any).vault.isAuthorized = true;
          (window as any).vault.status = 'idle';
          (window as any).vault.rootHandle = { kind: 'directory' };
          // Inject some dummy entities to ensure graph renders
          (window as any).vault.entities = {
            "node-1": { id: "node-1", title: "Node 1", connections: [] },
            "node-2": { id: "node-2", title: "Node 2", connections: [] },
            "node-3": { id: "node-3", title: "Node 3", connections: [] }
          };
        }
      };
      applyMocks();
      setInterval(applyMocks, 100);
    });

    await page.goto("/");
    // Wait for graph to be ready (cy instance) and layout to settle
    // Increase timeout significantly to debug if it's just slow or broken
    await page.waitForSelector('.minimap-container', { state: 'attached', timeout: 5000 });
    await page.waitForTimeout(1000);
  });

  test("should render the minimap container and canvas", async ({ page }) => {
    const minimap = page.locator('.minimap-container');
    await expect(minimap).toBeVisible();

    const canvas = minimap.locator('canvas');
    await expect(canvas).toBeVisible();

    // Check if viewport rect is present (it should be since graph has nodes)
    const viewportRect = minimap.locator('.viewport-rect');
    await expect(viewportRect).toBeVisible();
  });

  test("should pan graph when dragging viewport rect", async ({ page }) => {
    // 1. Get initial position of viewport rect
    const viewportRect = page.locator('.viewport-rect');
    await expect(viewportRect).toBeVisible();
    const boxBefore = await viewportRect.boundingBox();
    if (!boxBefore) throw new Error("Viewport rect not found");

    // 2. Drag it
    await viewportRect.hover();
    await page.mouse.down();
    await page.mouse.move(boxBefore.x + 50, boxBefore.y + 50);
    await page.mouse.up();

    // Allow RAF loop to catch up
    await page.waitForTimeout(100);

    // 3. Verify it moved (since graph syncs back, if graph panned, rect should be in new pos)
    // Note: The graph pan is async, but our test runs fast. We might need to wait for update.
    // The component uses RAF, so it should be within a frame or two.

    await expect.poll(async () => {
      const boxAfter = await viewportRect.boundingBox();
      return boxAfter?.x;
    }, { timeout: 2000 }).not.toBeCloseTo(boxBefore.x, 0); // Expect movement
  });

  test("should center graph when clicking minimap background", async ({ page }) => {
    // 1. Get initial viewport rect position
    const viewportRect = page.locator('.viewport-rect');
    const boxBefore = await viewportRect.boundingBox();
    if (!boxBefore) throw new Error("Viewport rect not found");

    // 2. Click somewhere else in the minimap (e.g. top-left corner)
    const minimap = page.locator('.minimap-container');
    const minimapBox = await minimap.boundingBox();
    if (!minimapBox) throw new Error("Minimap not found");

    // Click at 10,10 inside minimap (likely outside the center viewport)
    await minimap.click({ position: { x: 10, y: 10 } });

    // 3. Verify viewport rect moved to match new center
    await expect.poll(async () => {
      const boxAfter = await viewportRect.boundingBox();
      return boxAfter?.x;
    }, { timeout: 2000 }).not.toBeCloseTo(boxBefore.x, 0);
  });

  test("should toggle minimap visibility", async ({ page }) => {
    const minimap = page.locator('.minimap-container');

    // Initially not collapsed
    await expect(minimap).not.toHaveClass(/collapsed/);

    // Hover to show toggle button
    await minimap.hover();
    const toggleBtn = minimap.locator('.toggle-btn');
    await expect(toggleBtn).toBeVisible();

    // Click toggle
    await toggleBtn.click();
    await expect(minimap).toHaveClass(/collapsed/);

    // Click again to expand (toggle btn covers container in collapsed state logic)
    // Wait for transition?
    await page.waitForTimeout(300);
    await toggleBtn.click();
    await expect(minimap).not.toHaveClass(/collapsed/);
  });
});

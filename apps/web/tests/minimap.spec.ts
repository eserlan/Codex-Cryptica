import { test, expect } from "@playwright/test";

test.describe("Minimap Navigation", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Mock initialization to ensure a consistent graph state
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      localStorage.setItem("codex_skip_landing", "true");
      const applyMocks = () => {
        if ((window as any).vault) {
          (window as any).vault.isAuthorized = true;
          (window as any).vault.status = "idle";
          (window as any).vault.rootHandle = { kind: "directory" };
          // Inject some dummy entities to ensure graph renders
          (window as any).vault.entities = {
            "node-1": { id: "node-1", title: "Node 1", connections: [] },
            "node-2": { id: "node-2", title: "Node 2", connections: [] },
            "node-3": { id: "node-3", title: "Node 3", connections: [] },
          };
        }
      };
      applyMocks();
      setInterval(applyMocks, 100);
    });

    await page.goto("http://localhost:5173/");
    // Wait for app load
    await expect(
      page.getByRole("heading", { name: "Codex Cryptica" }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should toggle minimap using the dedicated button", async ({ page }) => {
    const toggleBtn = page.getByRole("button", { name: "Toggle Minimap" });
    const minimap = page.locator(".minimap-container");

    // Initially hidden
    await expect(minimap).toHaveCSS("opacity", "0");

    // Click to expand
    await toggleBtn.click();
    await expect(minimap).toHaveCSS("opacity", "1");
    await expect(minimap).not.toHaveClass(/collapsed/);

    // Click to collapse
    await toggleBtn.click();
    await expect(minimap).toHaveCSS("opacity", "0");
  });

  test("should render the minimap canvas when expanded", async ({ page }) => {
    const toggleBtn = page.getByRole("button", { name: "Toggle Minimap" });
    await toggleBtn.click();

    const minimap = page.locator(".minimap-container");
    const canvas = minimap.locator("canvas");
    await expect(canvas).toBeVisible();

    // Check if viewport rect is present (it should be since graph has nodes)
    const viewportRect = minimap.locator(".viewport-rect");
    await expect(viewportRect).toBeVisible();
  });

  test("should pan graph when dragging viewport rect", async ({ page }) => {
    const toggleBtn = page.getByRole("button", { name: "Toggle Minimap" });
    await toggleBtn.click();

    const minimap = page.locator(".minimap-container");
    const viewportRect = minimap.locator(".viewport-rect");
    await expect(viewportRect).toBeVisible();

    // Ensure graph has settled
    await page.waitForTimeout(500);

    const boxBefore = await viewportRect.boundingBox();
    if (!boxBefore) throw new Error("Viewport rect not found");

    // 2. Drag it
    await viewportRect.hover({ force: true });
    await page.mouse.down();
    await page.mouse.move(boxBefore.x + 50, boxBefore.y + 50);
    await page.mouse.up();

    // Allow RAF loop to catch up
    await page.waitForTimeout(100);

    await expect
      .poll(
        async () => {
          const boxAfter = await viewportRect.boundingBox();
          return boxAfter?.x;
        },
        { timeout: 2000 },
      )
      .not.toBeCloseTo(boxBefore.x, 0); // Expect movement
  });

  test("should center graph when clicking minimap background", async ({
    page,
  }) => {
    const toggleBtn = page.getByRole("button", { name: "Toggle Minimap" });
    await toggleBtn.click();

    const minimap = page.locator(".minimap-container");
    const viewportRect = page.locator(".viewport-rect");
    const boxBefore = await viewportRect.boundingBox();
    if (!boxBefore) throw new Error("Viewport rect not found");

    // Click at 10,10 inside minimap (likely outside the center viewport)
    await minimap.click({ position: { x: 10, y: 10 } });

    // 3. Verify viewport rect moved to match new center
    await expect
      .poll(
        async () => {
          const boxAfter = await viewportRect.boundingBox();
          return boxAfter?.x;
        },
        { timeout: 2000 },
      )
      .not.toBeCloseTo(boxBefore.x, 0);
  });
});

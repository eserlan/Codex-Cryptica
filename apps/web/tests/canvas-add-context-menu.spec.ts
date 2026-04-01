import { test, expect } from "@playwright/test";

test.describe("Add to Canvas - Context Menu", () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    // Inject global flag BEFORE goto so +layout.svelte sees it immediately
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      try { localStorage.setItem("codex_skip_landing", "true"); } catch { /* ignore */ }
    });

    // Navigate to graph view
    await page.goto("/");

    // Wait for app to load
    await page.waitForSelector('[data-testid="graph-canvas"]', {
      timeout: 15000,
    });

    // Extra wait for cytoscape to initialize nodes
    await page.waitForTimeout(5000);
  });

  async function createEntity(page: any, title: string) {
    await page.click('[data-testid="new-entity-button"]');
    await page.fill('[data-testid="new-entity-title-input"]', title);
    await page.keyboard.press("Enter");
    // Wait for node to appear in graph
    await page.waitForTimeout(2000);
  }

  async function openContextMenu(page: any) {
    // Wait for nodes to be actually available in cytoscape
    await page.waitForFunction(
      () => {
        const cy = (window as any).cy;
        return cy && cy.nodes().length > 0;
      },
      { timeout: 15000 },
    );

    await page.evaluate(() => {
      const cy = (window as any).cy;
      const node = cy.nodes()[0];
      // Force a fixed position if renderedPosition() is being difficult
      const pos = { x: 100, y: 100 };
      cy.emit("cxttap", { renderedPosition: pos, target: node });
    });

    await page.waitForTimeout(2000);
    await page.waitForSelector('[role="menu"]', { timeout: 15000 });
  }

  test("T011 - Add single entity to existing canvas via context menu", async ({
    page,
  }) => {
    await createEntity(page, "Test Entity");

    // Create a canvas via /canvas route (which auto-creates one if none exist)
    await page.goto("/canvas");
    await page.waitForURL(/\/canvas\/.+/);
    const canvasUrl = page.url();

    // Go back to graph
    await page.goto("/");
    await page.waitForSelector('[data-testid="graph-canvas"]');
    await page.waitForTimeout(3000);

    // Right-click to open context menu
    await openContextMenu(page);

    // Click "Add to Canvas" to show submenu
    await page.getByRole("menuitem", { name: "Add to Canvas" }).click();

    // Select the canvas from picker
    await page.click('[data-testid="canvas-picker-item"]');

    // Verify success toast
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();

    // Verify entity was added to canvas
    await page.goto(canvasUrl);
    await expect(page.locator(".svelte-flow__node")).toContainText(
      "Test Entity",
    );
  });

  test("T021 - Add multiple entities to canvas via context menu", async ({
    page,
  }) => {
    // Create multiple test entities
    for (let i = 1; i <= 3; i++) {
      await createEntity(page, `Multi Entity ${i}`);
    }

    // Ensure we have a canvas
    await page.goto("/canvas");
    await page.waitForURL(/\/canvas\/.+/);
    const canvasUrl = page.url();
    await page.goto("/");
    await page.waitForSelector('[data-testid="graph-canvas"]');
    await page.waitForTimeout(3000);

    // Select multiple nodes via Cytoscape API for reliability
    await page.evaluate(() => {
      const cy = (window as any).cy;
      if (cy) {
        cy.nodes().slice(0, 3).select();
      }
    });

    // Right-click on selection
    await openContextMenu(page);

    // Add to canvas
    await page.getByRole("menuitem", { name: "Add to Canvas" }).click();
    await page.click('[data-testid="canvas-picker-item"]');

    // Verify success toast with count
    await expect(page.locator('[data-testid="toast-success"]')).toContainText(
      "3 entities",
    );

    // Verify all entities were added
    await page.goto(canvasUrl);
    await expect(page.locator(".svelte-flow__node")).toHaveCount(3);
  });

  test("T027 - Create new canvas from selection via context menu", async ({
    page,
  }) => {
    await createEntity(page, "Canvas Creator Node");

    await openContextMenu(page);
    await page.getByRole("menuitem", { name: "Add to Canvas" }).click();
    await page.click('[data-testid="canvas-picker-create"]');

    // Handle the creation dialog
    const input = page.locator("#new-canvas-input");
    await expect(input).toBeVisible();
    await input.fill("Created from Selection");
    await page.click('[title="Confirm Creation"]');

    // Verify success toast
    await expect(page.locator('[data-testid="toast-success"]')).toContainText(
      "Created canvas",
    );

    // Verify redirect or presence in registry
    await page.goto("/canvas");
    await expect(page.locator("text=Created from Selection")).toBeVisible();
  });

  test("T019/T020 - Duplicate detection - skip entities already on canvas", async ({
    page,
  }) => {
    await createEntity(page, "Duplicate Test Node");

    // Ensure canvas exists
    await page.goto("/canvas");
    await page.waitForURL(/\/canvas\/.+/);
    await page.goto("/");
    await page.waitForSelector('[data-testid="graph-canvas"]');
    await page.waitForTimeout(3000);

    // Add entity to canvas first time
    await openContextMenu(page);
    await page.getByRole("menuitem", { name: "Add to Canvas" }).click();
    await page.click('[data-testid="canvas-picker-item"]');
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();

    // Try to add same entity again
    await openContextMenu(page);
    await page.getByRole("menuitem", { name: "Add to Canvas" }).click();
    await page.click('[data-testid="canvas-picker-item"]');

    // Verify duplicate notification
    await expect(page.locator('[data-testid="toast-info"]')).toContainText(
      "already on canvas",
    );
  });

  test("T025 - Create canvas with default name (entity count)", async ({
    page,
  }) => {
    // Create 5 entities
    for (let i = 1; i <= 5; i++) {
      await createEntity(page, `Count Entity ${i}`);
    }

    // Select all
    await page.evaluate(() => {
      const cy = (window as any).cy;
      if (cy) cy.nodes().select();
    });

    // Right-click and create new canvas
    await openContextMenu(page);
    await page.getByRole("menuitem", { name: "Add to Canvas" }).click();
    await page.click('[data-testid="canvas-picker-create"]');

    // Verify default name in input
    const input = page.locator("#new-canvas-input");
    const val = await input.inputValue();
    expect(val).toMatch(/\d+ entit/);

    // Save
    await page.click('[title="Confirm Creation"]');

    // Verify success toast
    await expect(page.locator('[data-testid="toast-success"]')).toContainText(
      "Created canvas",
    );
  });

  test("T026 - Cancel canvas creation flow", async ({ page }) => {
    await createEntity(page, "Cancel Test Node");

    await openContextMenu(page);
    await page.getByRole("menuitem", { name: "Add to Canvas" }).click();
    await page.click('[data-testid="canvas-picker-create"]');

    // Cancel the dialog
    await page.keyboard.press("Escape");

    // Verify modal closed (input not visible)
    await expect(page.locator("#new-canvas-input")).not.toBeVisible();
  });
});

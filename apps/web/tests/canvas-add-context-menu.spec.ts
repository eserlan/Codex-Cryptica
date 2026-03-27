import { test, expect } from "@playwright/test";

test.describe("Add to Canvas - Context Menu", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to graph view
    await page.goto("/");

    // Wait for app to load
    await page.waitForSelector('[data-testid="graph-container"]', {
      timeout: 10000,
    });
  });

  test("T011 - Add single entity to existing canvas via context menu", async ({
    page,
  }) => {
    // Create a test entity first
    await page.click('[data-testid="create-entity-button"]');
    await page.fill('[data-testid="entity-title-input"]', "Test Entity");
    await page.click('[data-testid="save-entity-button"]');
    await page.waitForTimeout(500);

    // Create a canvas
    await page.click('[data-testid="canvas-manager-button"]');
    await page.click('[data-testid="create-canvas-button"]');
    await page.fill('[data-testid="canvas-name-input"]', "Test Canvas");
    await page.click('[data-testid="save-canvas-button"]');
    await page.waitForTimeout(500);

    // Right-click on the entity node in graph
    const node = page.locator('[data-testid="graph-node"]').first();
    await node.click({ button: "right" });

    // Click "Add to Canvas"
    await page.click("text=Add to Canvas");

    // Select the canvas from picker
    await page.click("text=Test Canvas");

    // Verify success toast
    await expect(page.locator('[data-testid="toast-success"]')).toContainText(
      "Added to",
    );

    // Verify entity was added to canvas
    await page.click('[data-testid="canvas-manager-button"]');
    await page.click("text=Test Canvas");
    await expect(page.locator('[data-testid="canvas-node"]')).toContainText(
      "Test Entity",
    );
  });

  test("T021 - Add multiple entities to canvas via context menu", async ({
    page,
  }) => {
    // Create multiple test entities
    for (let i = 1; i <= 3; i++) {
      await page.click('[data-testid="create-entity-button"]');
      await page.fill('[data-testid="entity-title-input"]', `Entity ${i}`);
      await page.click('[data-testid="save-entity-button"]');
      await page.waitForTimeout(300);
    }

    // Create a canvas
    await page.click('[data-testid="canvas-manager-button"]');
    await page.click('[data-testid="create-canvas-button"]');
    await page.fill('[data-testid="canvas-name-input"]', "Multi Canvas");
    await page.click('[data-testid="save-canvas-button"]');
    await page.waitForTimeout(500);

    // Select multiple nodes (Ctrl+click)
    const nodes = page.locator('[data-testid="graph-node"]');
    await nodes.nth(0).click();
    await page.keyboard.down("Control");
    await nodes.nth(1).click();
    await nodes.nth(2).click();
    await page.keyboard.up("Control");
    await page.waitForTimeout(300);

    // Right-click on selected node
    await nodes.first().click({ button: "right" });

    // Click "Add to Canvas"
    await page.click("text=Add to Canvas");

    // Select the canvas
    await page.click("text=Multi Canvas");

    // Verify success toast with count
    await expect(page.locator('[data-testid="toast-success"]')).toContainText(
      "3 entities",
    );

    // Verify all entities were added
    await page.click('[data-testid="canvas-manager-button"]');
    await page.click("text=Multi Canvas");
    await expect(page.locator('[data-testid="canvas-node"]')).toHaveCount(3);
  });

  test("T027 - Create new canvas from selection via context menu", async ({
    page,
  }) => {
    // Create test entities
    for (let i = 1; i <= 2; i++) {
      await page.click('[data-testid="create-entity-button"]');
      await page.fill(
        '[data-testid="entity-title-input"]',
        `New Canvas Entity ${i}`,
      );
      await page.click('[data-testid="save-entity-button"]');
      await page.waitForTimeout(300);
    }

    // Select multiple nodes
    const nodes = page.locator('[data-testid="graph-node"]');
    await nodes.nth(0).click();
    await page.keyboard.down("Control");
    await nodes.nth(1).click();
    await page.keyboard.up("Control");
    await page.waitForTimeout(300);

    // Right-click to open context menu
    await nodes.first().click({ button: "right" });

    // Click "Add to Canvas"
    await page.click("text=Add to Canvas");

    // Click "+ New Canvas"
    await page.click("text=+ New Canvas");

    // Enter canvas name
    await page.fill(
      '[data-testid="canvas-name-input"]',
      "Created from Selection",
    );
    await page.click('[data-testid="save-canvas-button"]');

    // Verify success toast
    await expect(page.locator('[data-testid="toast-success"]')).toContainText(
      "Created canvas",
    );

    // Verify canvas was created with entities
    await page.click('[data-testid="canvas-manager-button"]');
    await page.click("text=Created from Selection");
    await expect(page.locator('[data-testid="canvas-node"]')).toHaveCount(2);
  });

  test("T019/T020 - Duplicate detection - skip entities already on canvas", async ({
    page,
  }) => {
    // Create entity and canvas
    await page.click('[data-testid="create-entity-button"]');
    await page.fill('[data-testid="entity-title-input"]', "Duplicate Test");
    await page.click('[data-testid="save-entity-button"]');
    await page.waitForTimeout(500);

    await page.click('[data-testid="canvas-manager-button"]');
    await page.click('[data-testid="create-canvas-button"]');
    await page.fill('[data-testid="canvas-name-input"]', "Duplicate Canvas");
    await page.click('[data-testid="save-canvas-button"]');
    await page.waitForTimeout(500);

    // Add entity to canvas first time
    const node = page.locator('[data-testid="graph-node"]').first();
    await node.click({ button: "right" });
    await page.click("text=Add to Canvas");
    await page.click("text=Duplicate Canvas");
    await expect(page.locator('[data-testid="toast-success"]')).toContainText(
      "Added",
    );

    // Try to add same entity again
    await node.click({ button: "right" });
    await page.click("text=Add to Canvas");
    await page.click("text=Duplicate Canvas");

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
      await page.click('[data-testid="create-entity-button"]');
      await page.fill('[data-testid="entity-title-input"]', `Entity ${i}`);
      await page.click('[data-testid="save-entity-button"]');
      await page.waitForTimeout(200);
    }

    // Select all entities
    const nodes = page.locator('[data-testid="graph-node"]');
    await nodes.first().click();
    await page.keyboard.down("Control");
    for (let i = 1; i < 5; i++) {
      await nodes.nth(i).click();
    }
    await page.keyboard.up("Control");

    // Right-click and create new canvas
    await nodes.first().click({ button: "right" });
    await page.click("text=Add to Canvas");
    await page.click("text=+ New Canvas");

    // Verify default name is "5 entities"
    const canvasNameInput = page.locator('[data-testid="canvas-name-input"]');
    await expect(canvasNameInput).toHaveValue("5 entities");

    // Save with default name
    await page.click('[data-testid="save-canvas-button"]');

    // Verify canvas was created
    await expect(page.locator('[data-testid="toast-success"]')).toContainText(
      'Created canvas "5 entities"',
    );
  });

  test("T026 - Cancel canvas creation flow", async ({ page }) => {
    // Create entity
    await page.click('[data-testid="create-entity-button"]');
    await page.fill('[data-testid="entity-title-input"]', "Cancel Test");
    await page.click('[data-testid="save-entity-button"]');
    await page.waitForTimeout(500);

    // Select entity and open canvas picker
    const node = page.locator('[data-testid="graph-node"]').first();
    await node.click({ button: "right" });
    await page.click("text=Add to Canvas");
    await page.click("text=+ New Canvas");

    // Cancel the dialog
    await page.keyboard.press("Escape");

    // Verify no canvas was created
    await page.click('[data-testid="canvas-manager-button"]');
    await expect(page.locator("text=Cancel Test")).not.toBeVisible();
  });
});

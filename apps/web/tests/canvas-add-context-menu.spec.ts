import { test, expect } from "@playwright/test";

test.describe("Add to Canvas - Context Menu", () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    // Inject global flag BEFORE goto so +layout.svelte sees it immediately
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      try {
        localStorage.setItem("codex_skip_landing", "true");
      } catch {
        /* ignore */
      }
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

  async function selectEntitiesByTitle(page: any, titles: string[]) {
    await page.evaluate((wantedTitles: string[]) => {
      const cy = (window as any).cy;
      const vault = (window as any).vault;
      if (!cy || !vault?.entities) return;

      cy.nodes().unselect();

      const ids = Object.values(vault.entities)
        .filter((entity: any) => wantedTitles.includes(entity.title))
        .map((entity: any) => entity.id);

      ids.forEach((id: string) => cy.$id(id).select());
    }, titles);
  }

  async function getEntityIdByTitle(page: any, title: string) {
    return page.evaluate((wantedTitle: string) => {
      const vault = (window as any).vault;
      const entity = Object.values(vault?.entities ?? {}).find(
        (entry: any) => entry.title === wantedTitle,
      ) as any;
      return entity?.id || null;
    }, title);
  }

  async function openContextMenu(page: any, titles: string[] = []) {
    if (titles.length > 0) {
      await selectEntitiesByTitle(page, titles);
    }

    await page.waitForFunction(
      () => {
        const cy = (window as any).cy;
        return cy && cy.nodes().length > 0;
      },
      { timeout: 15000 },
    );

    const targetId = await page.evaluate((wantedTitles: string[]) => {
      const cy = (window as any).cy;
      if (!cy) return null;

      const selected = cy.$("node:selected");
      const nodes =
        selected.length > 0
          ? selected
          : cy.nodes().filter((node: any) => {
              const vault = (window as any).vault;
              const entity = Object.values(vault?.entities ?? {}).find(
                (entry: any) => entry.id === node.id(),
              ) as any;
              return wantedTitles.includes(entity?.title);
            });

      const node = nodes[0] || cy.nodes()[0];
      return node ? node.id() : null;
    }, titles);

    expect(targetId).toBeTruthy();
    await page.evaluate((nodeId: string) => {
      const cy = (window as any).cy;
      if (!cy || !nodeId) return;
      const node = cy.$id(nodeId);
      if (node.length === 0) return;
      node.emit("cxttap", { renderedPosition: node.renderedPosition() });
    }, targetId);

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

    // Go back to graph
    await page.goto("/");
    await page.waitForSelector('[data-testid="graph-canvas"]');
    await page.waitForTimeout(3000);

    // Right-click to open context menu
    await openContextMenu(page, ["Test Entity"]);

    // Click "Add to Canvas" to show submenu
    await page.getByRole("menuitem", { name: "Add to Canvas" }).click();

    // Select the canvas from picker
    await page.click('[data-testid="canvas-picker-item"]');

    // Verify success toast
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();

    // Verify entity was added to the canvas registry
    const entityId = await getEntityIdByTitle(page, "Test Entity");
    await page.waitForFunction(
      (targetEntityId) => {
        const canvasRegistry = (window as any).canvasRegistry;
        return Boolean(
          canvasRegistry?.allCanvases?.some((canvas: any) =>
            canvas.nodes?.some((node: any) => node.entityId === targetEntityId),
          ),
        );
      },
      entityId,
      { timeout: 15000 },
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
    await page.goto("/");
    await page.waitForSelector('[data-testid="graph-canvas"]');
    await page.waitForTimeout(3000);

    await selectEntitiesByTitle(page, [
      "Multi Entity 1",
      "Multi Entity 2",
      "Multi Entity 3",
    ]);

    // Right-click on selection
    await openContextMenu(page, [
      "Multi Entity 1",
      "Multi Entity 2",
      "Multi Entity 3",
    ]);

    // Add to canvas
    await page.getByRole("menuitem", { name: "Add to Canvas" }).click();
    await page.click('[data-testid="canvas-picker-item"]');

    // Verify success toast with count
    await expect(page.locator('[data-testid="toast-success"]')).toContainText(
      "3 entities",
    );

    // Verify all entities were added to the canvas registry
    const entityIds = await page.evaluate(() => {
      const vault = (window as any).vault;
      return Object.values(vault?.entities ?? {})
        .filter((entity: any) =>
          ["Multi Entity 1", "Multi Entity 2", "Multi Entity 3"].includes(
            entity.title,
          ),
        )
        .map((entity: any) => entity.id);
    });

    await page.waitForFunction(
      (targetEntityIds) => {
        const canvasRegistry = (window as any).canvasRegistry;
        return Boolean(
          canvasRegistry?.allCanvases?.some((canvas: any) =>
            targetEntityIds.every((entityId: string) =>
              canvas.nodes?.some((node: any) => node.entityId === entityId),
            ),
          ),
        );
      },
      entityIds,
      { timeout: 15000 },
    );
  });

  test("T027 - Create new canvas from selection via context menu", async ({
    page,
  }) => {
    await createEntity(page, "Canvas Creator Node");

    await openContextMenu(page, ["Canvas Creator Node"]);
    await page.getByRole("menuitem", { name: "Add to Canvas" }).click();

    // Handle prompt
    page.once("dialog", async (dialog) => {
      await dialog.accept("Created from Selection");
    });
    await page.click('[data-testid="canvas-picker-create"]');

    // Wait for success toast instead of navigation (navigation happens after toast)
    await expect(page.locator('[data-testid="toast-success"]')).toContainText(
      "Created canvas",
    );

    // Verify the new canvas is persisted in the registry
    await page.waitForFunction(
      () =>
        Boolean(
          (window as any).canvasRegistry?.allCanvases?.some(
            (canvas: any) => canvas.name === "Created from Selection",
          ),
        ),
      { timeout: 15000 },
    );
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
    await openContextMenu(page, ["Duplicate Test Node"]);
    await page.getByRole("menuitem", { name: "Add to Canvas" }).click();
    await page.click('[data-testid="canvas-picker-item"]');
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();

    // Try to add same entity again
    await openContextMenu(page, ["Duplicate Test Node"]);
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

    await selectEntitiesByTitle(page, [
      "Count Entity 1",
      "Count Entity 2",
      "Count Entity 3",
      "Count Entity 4",
      "Count Entity 5",
    ]);

    // Right-click and create new canvas
    await openContextMenu(page, [
      "Count Entity 1",
      "Count Entity 2",
      "Count Entity 3",
      "Count Entity 4",
      "Count Entity 5",
    ]);
    await page.getByRole("menuitem", { name: "Add to Canvas" }).click();

    // Handle prompt - empty string means use default
    page.once("dialog", async (dialog) => {
      await dialog.accept("");
    });
    await page.click('[data-testid="canvas-picker-create"]');

    // Verify success toast
    await expect(page.locator('[data-testid="toast-success"]')).toContainText(
      "Created canvas",
    );
  });

  test("T026 - Cancel canvas creation flow", async ({ page }) => {
    await createEntity(page, "Cancel Test Node");

    await openContextMenu(page, ["Cancel Test Node"]);
    await page.getByRole("menuitem", { name: "Add to Canvas" }).click();

    // Dismiss prompt
    page.once("dialog", async (dialog) => {
      await dialog.dismiss();
    });
    await page.click('[data-testid="canvas-picker-create"]');

    // Verify NO success toast appeared
    await expect(
      page.locator('[data-testid="toast-success"]'),
    ).not.toBeVisible();
  });
});

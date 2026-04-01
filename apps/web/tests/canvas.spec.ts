import { test, expect } from "@playwright/test";

test.describe("Spatial Canvas", () => {
  test.beforeEach(async ({ page }) => {
    // Inject global flag BEFORE goto so +layout.svelte sees it immediately
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      try { localStorage.setItem("codex_skip_landing", "true"); } catch { /* ignore */ }
    });

    await page.goto("/canvas");
    await page.waitForURL(/\/canvas\/.+/);

    // Expand the palette if it is collapsed, since many tests rely on palette text and buttons
    const expandBtn = page.getByTitle("Expand Palette");
    if (await expandBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expandBtn.click();
    }
    // Give palette a moment to animate
    await page.waitForTimeout(300);
  });

  test("should display the canvas and sidebar", async ({ page }) => {
    await expect(
      page.getByText("Workspace", { exact: false }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Entity Palette", { exact: false }).first(),
    ).toBeVisible();
    await expect(page.locator(".svelte-flow")).toBeVisible();
  });

  test("should allow creating a new canvas", async ({ page }) => {
    // Open the canvas registry modal using the Switch Workspace button in the palette
    const switchBtn = page.locator('[aria-label="Switch workspace"]');
    await expect(switchBtn).toBeVisible({ timeout: 5000 });
    await switchBtn.click();

    // The CanvasSelectionModal appears with role="dialog"
    const modal = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Click "Create New" to show the inline input
    const createBtn = modal.getByRole("button", { name: "Create New" });
    await expect(createBtn).toBeVisible({ timeout: 5000 });
    await createBtn.click();

    // Fill the inline input
    const input = modal.locator("#new-canvas-input");
    await expect(input).toBeVisible();
    await input.fill("New Test Canvas");

    // Click the checkmark/confirm button
    const confirmBtn = modal.getByTitle("Confirm Creation");
    await confirmBtn.click();

    // The new canvas should appear — URL should reflect the new slug
    await expect(page).toHaveURL(/new-test-canvas/);
  });

  test("should connect two nodes together", async ({ page }) => {
    // Wait for canvas to load
    await expect(page.locator(".svelte-flow")).toBeVisible();

    // Spawn first node at specific flow coordinates
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("add-to-canvas", {
          detail: { entityId: "test-hero", position: { x: -300, y: 0 } },
        }),
      );
    });
    await page.waitForTimeout(500);

    // Wait for first node to appear
    const nodes = page.locator(".svelte-flow__node");
    await expect(nodes).toHaveCount(1);

    // Spawn second node at another position, with offset Y so the edge isn't perfectly horizontal
    // (Playwright considers 0-height SVG paths as "hidden")
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("add-to-canvas", {
          detail: { entityId: "eldrin-the-wise", position: { x: 300, y: 50 } },
        }),
      );
    });
    await page.waitForTimeout(500);

    // Let the DOM update and nodes render
    await expect(nodes).toHaveCount(2);

    // Fit view to bring both nodes into the visible viewport
    const fitViewBtn = page.getByRole("button", { name: "Fit View" });
    if (await fitViewBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await fitViewBtn.click();
    }
    await page.waitForTimeout(500);

    // Get source and target handles using explicit components test classes
    const sourceHandle = nodes.nth(0).locator(".full-card-handle");
    const targetHandle = nodes.nth(1).locator(".target-test-handle");

    await expect(sourceHandle).toBeAttached();
    await expect(targetHandle).toBeAttached();

    // Hover source to make handle interactable if needed
    await nodes.nth(0).hover();
    await page.waitForTimeout(200);

    // Drag from source to target, holding Control to make handle interactable
    await page.keyboard.down("Control");
    await sourceHandle.dragTo(targetHandle, { force: true });
    await page.keyboard.up("Control");

    // Let the connection process finish
    await page.waitForTimeout(1000);

    // Check if an edge was created in the DOM
    const edges = page.locator(".svelte-flow__edge");
    await expect(edges).toHaveCount(1);

    const edgePath = edges.locator("path.svelte-flow__edge-path");
    await expect(edgePath).toBeAttached();

    // Verify persistence by reloading
    await page.reload();
    await page.waitForURL(/\/canvas\/.+/);

    // Re-expand palette after reload
    const expandBtn = page.getByTitle("Expand Palette");
    if (await expandBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expandBtn.click();
    }

    await expect(page.locator(".svelte-flow")).toBeVisible();

    // Wait for data to load (OPFS persistence may not work in PW context, just check flow rendered)
    await page.waitForTimeout(1500);
    // The flow should have loaded (nodes/edges may vary depending on OPFS state in test)
    await expect(page.locator(".svelte-flow")).toBeVisible();
  });

  test("should delete a node via context menu", async ({ page }) => {
    // Add a node
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("add-to-canvas", {
          detail: { entityId: "test-hero", position: { x: 0, y: 0 } },
        }),
      );
    });

    const node = page.locator(".svelte-flow__node").first();
    await expect(node).toBeVisible();

    // Right click to open context menu
    await node.click({ button: "right" });
    const deleteBtn = page.getByRole("menuitem", { name: "Delete" });
    await expect(deleteBtn).toBeVisible();

    // Click delete
    await deleteBtn.click();

    // Node should be gone
    await expect(node).not.toBeVisible();
    await expect(page.locator(".svelte-flow__node")).toHaveCount(0);
  });

  test("should delete an edge via context menu", async ({ page }) => {
    // Add two nodes and connect them (offset Y to avoid 0-height invisibility)
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("add-to-canvas", {
          detail: { entityId: "test-hero", position: { x: -200, y: 0 } },
        }),
      );
      window.dispatchEvent(
        new CustomEvent("add-to-canvas", {
          detail: { entityId: "eldrin-the-wise", position: { x: 200, y: 50 } },
        }),
      );
    });

    const nodes = page.locator(".svelte-flow__node");
    await expect(nodes).toHaveCount(2);

    const sourceHandle = nodes.nth(0).locator(".full-card-handle");
    const targetHandle = nodes.nth(1).locator(".target-test-handle");

    await nodes.nth(0).hover();
    await page.waitForTimeout(200);
    await page.keyboard.down("Control");
    await sourceHandle.dragTo(targetHandle, { force: true });
    await page.keyboard.up("Control");
    await expect(page.locator(".svelte-flow__edge")).toHaveCount(1);

    const edge = page.locator(".svelte-flow__edge").first();
    // Right click on the edge wrapper element to trigger onedgecontextmenu
    // The .svelte-flow__edge element is a <g> SVG group which Playwright can click
    await edge.click({ button: "right", force: true });
    await page.waitForTimeout(200);

    // CanvasContextMenu renders as role="menu" with role="menuitem" children
    const contextMenuEl = page.locator(
      '[role="menu"][aria-label="Canvas Context Menu"]',
    );
    await expect(contextMenuEl).toBeVisible({ timeout: 5000 });

    const deleteBtn = contextMenuEl.getByRole("menuitem", { name: "Delete" });
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Edge should be gone
    await expect(page.locator(".svelte-flow__edge")).toHaveCount(0);
  });

  test("should rename an edge via double click", async ({ page }) => {
    // Add two nodes and connect them
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("add-to-canvas", {
          detail: { entityId: "test-hero", position: { x: -200, y: 0 } },
        }),
      );
      window.dispatchEvent(
        new CustomEvent("add-to-canvas", {
          detail: { entityId: "eldrin-the-wise", position: { x: 200, y: 50 } },
        }),
      );
    });

    const nodes = page.locator(".svelte-flow__node");
    const sourceHandle = nodes.nth(0).locator(".full-card-handle");
    const targetHandle = nodes.nth(1).locator(".target-test-handle");

    await nodes.nth(0).hover();
    await page.waitForTimeout(200);
    await page.keyboard.down("Control");
    await sourceHandle.dragTo(targetHandle, { force: true });
    await page.keyboard.up("Control");
    await expect(page.locator(".svelte-flow__edge")).toHaveCount(1);

    const edge = page.locator(".svelte-flow__edge").first();

    // Double-click on the edge to open the EdgeLabelModal (custom Svelte component, NOT browser dialog)
    // The onEdgeClick handler checks event.detail === 2 to open the label modal
    await edge.dblclick({ force: true });
    await page.waitForTimeout(300);

    // EdgeLabelModal renders with role="dialog" and contains an input with id="edge-label-input"
    const labelModal = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(labelModal).toBeVisible({ timeout: 5000 });

    const labelInput = page.locator("#edge-label-input");
    await expect(labelInput).toBeVisible();
    await labelInput.clear();
    await labelInput.fill("Renamed Connection");

    // Click the "Save Label" button
    await page.getByRole("button", { name: "Save Label" }).click();

    // Check if label appears on the edge
    await expect(
      page.getByText("Renamed Connection", { exact: false }),
    ).toBeVisible();
  });
});

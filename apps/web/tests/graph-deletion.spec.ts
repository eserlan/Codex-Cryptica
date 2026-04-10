import { test, expect } from "@playwright/test";

test.describe("Graph Deletion and UI Safety", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      try {
        localStorage.setItem("codex_skip_landing", "true");
      } catch {
        /* ignore */
      }
    });

    await page.goto("/");
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 10000,
    });

    // Wait for vault initialization
    await page.evaluate(async () => {
      const waitForVault = () =>
        new Promise((resolve) => {
          const check = () => {
            const vault = (window as any).vault;
            if (vault && vault.status === "idle") {
              resolve(true);
            } else {
              setTimeout(check, 100);
            }
          };
          check();
        });
      await waitForVault();
    });
  });

  test("should delete multiple nodes from graph context menu", async ({
    page,
  }) => {
    // 1. Create two entities
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Chronicle Title...").fill("Node A");
    await page.getByRole("button", { name: "ADD" }).click();

    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Chronicle Title...").fill("Node B");
    await page.getByRole("button", { name: "ADD" }).click();

    // Select both nodes
    await page.evaluate(async () => {
      const cy = (window as any).cy;
      cy.nodes().select();
    });

    // Right click to open context menu
    await page.evaluate(() => {
      const cy = (window as any).cy;
      const node = cy.nodes()[0];
      const pos = node.renderedPosition();
      node.trigger("cxttap", { renderedPosition: pos });
    });

    const deleteMenuItem = page.getByRole("menuitem", {
      name: /Delete 2 Nodes/,
    });
    await expect(deleteMenuItem).toBeVisible();

    await deleteMenuItem.click();

    // Accept the Svelte confirmation dialog
    await page
      .locator('[class*="z-\\[200\\]"]')
      .getByRole("button", { name: "Delete" })
      .click();

    // Verify notification
    await expect(page.getByText("Deleted 2 nodes.")).toBeVisible();

    // Verify nodes are gone from UI
    await expect(page.getByText("Node A")).not.toBeVisible();
    await expect(page.getByText("Node B")).not.toBeVisible();

    // Verify nodes are gone from Store
    const storeCount = await page.evaluate(() => {
      return Object.keys((window as any).vault.entities).length;
    });
    expect(storeCount).toBe(0);
  });

  test("Zen Mode should auto-close when viewing an entity that gets deleted", async ({
    page,
  }) => {
    // 1. Create an entity
    const entityId = await page.evaluate(async () => {
      const vault = (window as any).vault;
      return await vault.createEntity("character", "Ephemeral Node", {
        content: "Will be deleted",
      });
    });

    // 2. Open Zen Mode for it via uiStore to be reliable
    await page.evaluate((id) => {
      (window as any).uiStore.openZenMode(id);
    }, entityId);

    const modal = page.getByTestId("zen-mode-modal");
    await expect(modal).toBeVisible();
    await expect(modal.getByTestId("entity-title")).toHaveText(
      "Ephemeral Node",
    );

    // 3. Delete the entity programmatically (simulating external deletion or store update)
    await page.evaluate(async (id) => {
      const vault = (window as any).vault;
      await vault.deleteEntity(id);
    }, entityId);

    // 4. Modal should close automatically via the $effect guard
    await expect(modal).not.toBeVisible();
  });
});

import { test, expect } from "@playwright/test";

test.describe("Graph Category Context Menu", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );
    });

    await page.goto("/");
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 10000,
    });

    await page.evaluate(async () => {
      const waitForVault = () =>
        new Promise((resolve) => {
          const check = () => {
            const vault = (window as any).vault;
            if (vault && vault.status === "idle") resolve(true);
            else setTimeout(check, 100);
          };
          check();
        });
      await waitForVault();
    });

    // Create a test entity
    await page.evaluate(async () => {
      const vault = (window as any).vault;
      await vault.createEntity("character", "Category Test Node", {
        id: "category-test-node",
      });
    });

    await page.waitForTimeout(500);
  });

  test("should change category for a single node via context menu", async ({
    page,
  }) => {
    // Trigger context menu on the node via Cytoscape
    await page.evaluate(() => {
      const cy = (window as any).cy;
      const node = cy.nodes()[0];
      const pos = node.renderedPosition();
      node.trigger("cxttap", { renderedPosition: pos });
    });

    const categoryButton = page.getByRole("menuitem", {
      name: "Change Category",
    });
    await expect(categoryButton).toBeVisible({ timeout: 5000 });

    // Hover to trigger submenu
    await categoryButton.hover();

    const categoryPicker = page.getByRole("menu", { name: "Select category" });
    await expect(categoryPicker).toBeVisible();

    // Select 'Location'
    const targetCategory = categoryPicker
      .getByRole("menuitem", { name: /Location/i })
      .first();
    await targetCategory.click();

    // Verify notification
    await expect(page.getByText("Category updated.")).toBeVisible();

    // Verify menu closed
    await expect(categoryPicker).not.toBeVisible();
  });

  test("should handle escape to close category menu", async ({ page }) => {
    await page.evaluate(() => {
      const cy = (window as any).cy;
      const node = cy.nodes()[0];
      const pos = node.renderedPosition();
      node.trigger("cxttap", { renderedPosition: pos });
    });

    const categoryButton = page.getByRole("menuitem", {
      name: "Change Category",
    });
    await expect(categoryButton).toBeVisible({ timeout: 5000 });
    await categoryButton.hover();

    const categoryPicker = page.getByRole("menu", { name: "Select category" });
    await expect(categoryPicker).toBeVisible();

    // Press Escape
    await page.keyboard.press("Escape");

    await expect(categoryPicker).not.toBeVisible();
    await expect(
      page.getByRole("menu", { name: "Node actions" }),
    ).not.toBeVisible();
  });
});

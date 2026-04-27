import { test, expect } from "@playwright/test";

test.describe("Graph Category Context Menu", () => {
  test.beforeEach(async ({ page }) => {
    // Inject E2E flag
    await page.addInitScript(() => {
      (window as any).__E2E__ = true;
    });

    await page.goto("/vault/default");
    // Wait for graph to load and settle
    await page.waitForSelector("canvas");
    await page.waitForTimeout(2000);
  });

  test("should change category for a single node via context menu", async ({
    page,
  }) => {
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    // Right-click center of canvas
    await canvas.click({
      button: "right",
      position: { x: box.width / 2, y: box.height / 2 },
    });

    const categoryButton = page.getByRole("menuitem", {
      name: "Change Category",
    });
    await expect(categoryButton).toBeVisible();

    // Hover to trigger submenu
    await categoryButton.hover();

    const categoryPicker = page.getByRole("menu", { name: "Select category" });
    await expect(categoryPicker).toBeVisible();

    // Select 'Character'
    const targetCategory = categoryPicker
      .getByRole("menuitem", { name: /Character/i })
      .first();
    await targetCategory.click();

    // Verify notification
    await expect(page.getByText("Category updated.")).toBeVisible();

    // Verify menu closed
    await expect(categoryPicker).not.toBeVisible();
  });

  test("should handle escape to close category menu", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    await canvas.click({
      button: "right",
      position: { x: box.width / 2, y: box.height / 2 },
    });

    const categoryButton = page.getByRole("menuitem", {
      name: "Change Category",
    });
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

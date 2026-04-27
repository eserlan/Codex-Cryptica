import { test, expect } from "@playwright/test";

test.describe("Graph Image Generation Context Menu", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__E2E__ = true;
    });

    await page.goto("/vault/default");
    await page.waitForSelector("canvas");
    await page.waitForTimeout(2000);
  });

  test("should show image actions and handle interaction", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    // Right-click center
    await canvas.click({
      button: "right",
      position: { x: box.width / 2, y: box.height / 2 },
    });

    const imageSubMenu = page.getByRole("menuitem", { name: "Image" });
    await expect(imageSubMenu).toBeVisible();

    // Hover to see generation actions
    await imageSubMenu.hover();

    const imagePicker = page.getByRole("menu", { name: "Image actions" });
    await expect(imagePicker).toBeVisible();

    const genButton = imagePicker.getByRole("menuitem", {
      name: /(Gen|Regen) Image/,
    });
    await expect(genButton).toBeVisible();

    // Test clicking main menu - should close menu (either opens lightbox or sub-menu toggle)
    await imageSubMenu.click();
    await expect(imagePicker).not.toBeVisible();
  });
});

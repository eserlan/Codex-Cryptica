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

  test("should show image sub-menu and trigger generation", async ({
    page,
  }) => {
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    // Right-click center
    await canvas.click({
      button: "right",
      position: { x: box.width / 2, y: box.height / 2 },
    });

    // Find the 'Image' sub-menu trigger
    const imageSubMenu = page.getByRole("menuitem", { name: "Image" });
    await expect(imageSubMenu).toBeVisible();

    // Hover to open
    await imageSubMenu.hover();

    const imagePicker = page.getByRole("menu", { name: "Image actions" });
    await expect(imagePicker).toBeVisible();

    // Find the Gen/Regen button
    const genButton = imagePicker.getByRole("menuitem", {
      name: /(Gen|Regen) Image/,
    });
    await expect(genButton).toBeVisible();

    await genButton.click();

    // Both menus should close
    await expect(imagePicker).not.toBeVisible();
    await expect(
      page.getByRole("menu", { name: "Node actions" }),
    ).not.toBeVisible();
  });

  test("should handle escape to close image menu", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    await canvas.click({
      button: "right",
      position: { x: box.width / 2, y: box.height / 2 },
    });

    const imageSubMenu = page.getByRole("menuitem", { name: "Image" });
    await imageSubMenu.hover();

    const imagePicker = page.getByRole("menu", { name: "Image actions" });
    await expect(imagePicker).toBeVisible();

    // Press Escape
    await page.keyboard.press("Escape");

    await expect(imagePicker).not.toBeVisible();
    await expect(
      page.getByRole("menu", { name: "Node actions" }),
    ).not.toBeVisible();
  });
});

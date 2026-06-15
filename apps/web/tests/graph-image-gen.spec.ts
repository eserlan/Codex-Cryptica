import { test, expect } from "@playwright/test";
import {
  openGraphContextMenuForTitle,
  seedEntity,
  setupVaultPage,
} from "./test-helpers";

test.describe("Graph Image Generation Context Menu", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  test("should show image actions and handle interaction", async ({ page }) => {
    const title = "Image Action Node";
    await seedEntity(page, {
      title,
      content: "A node used to verify graph image context menu actions.",
    });
    await openGraphContextMenuForTitle(page, title);

    const imageSubMenu = page.getByRole("menuitem", {
      name: "Image actions",
    });
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

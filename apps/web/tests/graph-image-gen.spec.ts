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

  test("should show regenerate image option and trigger it", async ({
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

    const genButton = page.getByRole("menuitem", { name: "Regenerate Image" });
    await expect(genButton).toBeVisible();

    // We mock the oracle.drawEntity or just click it and expect a generic error or success
    // Since we are in E2E, it might actually call the service if not blocked.
    // But we just want to verify the button exists and is clickable.
    await genButton.click();

    // The context menu should close
    await expect(genButton).not.toBeVisible();
  });
});

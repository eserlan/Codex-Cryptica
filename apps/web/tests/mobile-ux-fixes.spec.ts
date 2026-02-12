import { test, expect } from "@playwright/test";

test.describe("Mobile UX Fixes", () => {
  test.beforeEach(async ({ page }) => {
    // Mock init
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
    });
    await page.goto("/");

    // Wait for app load
    await expect(page.locator(".app-layout")).toBeVisible({ timeout: 10000 });
  });

  test("Entity Detail Panel should have solid background and high z-index", async ({
    page,
  }) => {
    await page.waitForFunction(() => (window as any).vault);

    await page.evaluate(() => {
      const vault = (window as any).vault;
      vault.isInitialized = true;
      vault.rootHandle = {};

      vault.entities = {
        "test-id": {
          id: "test-id",
          title: "Test Entity",
          type: "npc",
          content: "Content",
          tags: [],
          labels: [],
          connections: [],
        },
      };
      vault.selectedEntityId = "test-id";
    });

    const panel = page.locator("aside").first();
    await expect(panel).toBeVisible({ timeout: 5000 });
    await expect(panel).toHaveCSS("z-index", "50");

    const bg = await panel.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
    expect(bg).not.toBe("transparent");
  });
});

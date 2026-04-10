import { test, expect } from "@playwright/test";

test.describe("Mobile Explorer Scrolling", () => {
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
    await page.waitForFunction(() => (window as any).vault?.status === "idle", {
      timeout: 15000,
    });
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 10000,
    });
  });

  test("explorer header stays fixed while list scrolls on mobile", async ({
    page,
  }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Create multiple entities to enable scrolling
    for (let i = 0; i < 10; i++) {
      await page.getByTestId("new-entity-button").click();
      await page.getByPlaceholder("Chronicle Title...").fill(`Entity ${i}`);
      await page.getByRole("button", { name: "ADD" }).click();
    }

    // Open the explorer sidebar
    await page.getByTitle("Entity Explorer").click();
    await page.waitForTimeout(300);

    // Verify header search is visible initially
    const searchInput = page.getByPlaceholder("Search entities...");
    await expect(searchInput).toBeVisible();

    // Get the list container and scroll it
    const listContainer = page.locator(
      '[style*="touch-action"], .flex-1.overflow-y-auto',
    );
    await listContainer
      .first()
      .evaluate((el: HTMLElement) => el.scrollTo({ top: 200 }));
    await page.waitForTimeout(100);

    // Header with search should still be visible after scroll (fixed position)
    await expect(searchInput).toBeVisible();
  });
});

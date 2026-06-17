import { test, expect } from "@playwright/test";
import { seedEntities, setupVaultPage } from "./test-helpers";

test.describe("Mobile Explorer Scrolling", () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport BEFORE navigation so responsive layout initializes correctly
    await page.setViewportSize({ width: 375, height: 667 });
    await setupVaultPage(page);
  });

  test("explorer header stays fixed while list scrolls on mobile", async ({
    page,
  }) => {
    // Create multiple entities to enable scrolling
    await seedEntities(
      page,
      Array.from({ length: 20 }, (_, i) => ({
        title: `Entity ${i.toString().padStart(2, "0")}`,
      })),
    );

    // Open the explorer sidebar directly; the dev debug overlay can cover the
    // mobile activity bar in test runs.
    await page.evaluate(() => {
      (window as any).layoutUIStore.toggleSidebarTool("explorer");
    });
    const explorerPanel = page.getByTestId("entity-explorer-panel");
    await expect(explorerPanel).toBeVisible();

    const searchInput = page.getByPlaceholder("Search entities...");
    await expect(searchInput).toBeVisible();

    // Record header position before scroll
    const headerBoxBefore = await searchInput.boundingBox();
    expect(headerBoxBefore).not.toBeNull();

    // Get the list container inside the explorer panel and verify it can scroll
    const listContainer = explorerPanel
      .locator('[style*="touch-action"], .flex-1.overflow-y-auto')
      .first();
    await expect(listContainer).toBeVisible();

    // Verify the container is actually scrollable
    const scrollMetricsBefore = await listContainer.evaluate(
      (el: HTMLElement) => ({
        scrollTop: el.scrollTop,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      }),
    );
    expect(scrollMetricsBefore.scrollHeight).toBeGreaterThan(
      scrollMetricsBefore.clientHeight,
    );

    // Scroll the list and assert that the scroll position changes
    await listContainer.evaluate((el: HTMLElement) =>
      el.scrollTo({
        top: Math.min(200, Math.max(0, el.scrollHeight - el.clientHeight)),
      }),
    );

    await expect
      .poll(async () =>
        listContainer.evaluate((el: HTMLElement) => el.scrollTop),
      )
      .toBeGreaterThan(scrollMetricsBefore.scrollTop);

    // Header with search should still be visible after list scroll
    await expect(searchInput).toBeVisible();
    const headerBoxAfter = await searchInput.boundingBox();
    expect(headerBoxAfter).not.toBeNull();
    // Header position should not have moved (fixed position)
    expect(
      Math.abs(headerBoxAfter!.y - headerBoxBefore!.y),
    ).toBeLessThanOrEqual(1);
  });
});

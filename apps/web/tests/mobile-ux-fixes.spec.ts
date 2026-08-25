import { test, expect } from "@playwright/test";
import { setupVaultPage, seedEntity } from "./test-helpers";

test.describe("Mobile UX Fixes", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  test("Entity Detail Panel should have solid background and high z-index", async ({
    page,
  }) => {
    const entityId = await seedEntity(page, {
      type: "npc",
      title: "Test Entity",
      content: "Content",
    });

    await page.evaluate((id) => {
      (window as any).vault.selectedEntityId = id;
    }, entityId);

    const panel = page.getByTestId("entity-detail-panel");
    await expect(panel).toBeVisible({ timeout: 10000 });
    await expect(panel).toHaveCSS("z-index", "50");

    const bg = await panel.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
    expect(bg).not.toBe("transparent");
  });

  test("Embedded entity view should expose a mobile scroll container", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const entityId = await seedEntity(page, {
      type: "npc",
      title: "Scrollable Entity",
      content: Array.from({ length: 80 }, (_, i) => `Line ${i + 1}`).join(
        "\n\n",
      ),
    });

    await page.evaluate((id) => {
      const layout = (window as any).layoutUIStore;
      if (layout) {
        layout.focusedEntityId = id;
        layout.mainViewMode = "focus";
      }
    }, entityId);

    await expect(page.getByTestId("embedded-entity-view")).toBeVisible({
      timeout: 15000,
    });

    const scrollShell = page.getByTestId("zen-mobile-scroll-container");
    await expect(scrollShell).toBeVisible({ timeout: 15000 });

    const metrics = await scrollShell.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        overflowY: style.overflowY,
        touchAction: style.touchAction,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      };
    });

    expect(metrics.overflowY).toBe("auto");
    expect(metrics.touchAction).toBe("pan-y");
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  });
});

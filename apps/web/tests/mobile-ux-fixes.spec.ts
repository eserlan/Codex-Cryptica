import { test, expect } from "@playwright/test";

test.describe("Mobile UX Fixes", () => {
  test.beforeEach(async ({ page }) => {
    // Mock init
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );
    });
    await page.goto("/");

    // Wait for app load
    await page.waitForSelector(".app-layout", { timeout: 10000 });

    // Dismiss any landing or world page overlays on load
    await page.evaluate(() => {
      const ui = (window as any).uiStore;
      if (ui) {
        ui.dismissedWorldPage = true;
        ui.dismissedLandingPage = true;
      }
    });
  });

  test("Entity Detail Panel should have solid background and high z-index", async ({
    page,
  }) => {
    await page.waitForFunction(() => (window as any).vault?.status === "idle", {
      timeout: 15000,
    });

    const entityId = await page.evaluate(async () => {
      const vault = (window as any).vault;
      vault.isInitialized = true;
      vault.rootHandle = {};
      return await vault.createEntity("npc", "Test Entity", {
        content: "Content",
      });
    });
    await page.evaluate((id) => {
      (window as any).vault.selectedEntityId = id;
    }, entityId);

    await page.waitForFunction(
      (id) => (window as any).vault?.selectedEntityId === id,
      entityId,
    );
    await page.waitForFunction(
      (id) => !!(window as any).vault?.entities?.[id],
      entityId,
    );

    const panel = page.getByTestId("entity-detail-panel");
    await expect(panel).toBeVisible({ timeout: 5000 });
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

    await page.waitForFunction(() => (window as any).vault?.status === "idle", {
      timeout: 15000,
    });

    const entityId = await page.evaluate(async () => {
      const vault = (window as any).vault;
      vault.isInitialized = true;
      vault.rootHandle = {};
      return await vault.createEntity("npc", "Scrollable Entity", {
        content: Array.from({ length: 80 }, (_, i) => `Line ${i + 1}`).join(
          "\n\n",
        ),
      });
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

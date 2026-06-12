import { test, expect } from "@playwright/test";

test.describe("Mobile Entity Explorer (Issue 1311)", () => {
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

  test("Entity explorer items with long titles should wrap labels below the text to prevent collision on mobile viewports", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.waitForFunction(
      () => {
        const v = (window as any).vault;
        return v && v.isInitialized && v.status === "idle";
      },
      { timeout: 15000 },
    );

    // Dismiss any landing or world page overlays after vault is ready
    await page.evaluate(() => {
      const ui = (window as any).uiStore;
      if (ui) {
        ui.dismissedWorldPage = true;
        ui.dismissedLandingPage = true;
      }
    });

    // Create an entity with a long title and labels
    const entityId = await page.evaluate(async () => {
      const vault = (window as any).vault;
      vault.isInitialized = true;
      vault.rootHandle = {};
      const id = await vault.createEntity(
        "npc",
        "A Very Long Entity Name That Will Wrap On Mobile Screen Width",
        {
          content: "Content",
          labels: ["Quest", "Secret"],
        },
      );
      return id;
    });

    await page.waitForFunction((id) => {
      const ent = (window as any).vault?.entities?.[id];
      return ent && ent.labels && ent.labels.includes("Quest");
    }, entityId);

    // Open the explorer sidebar directly via UI store state
    await page.evaluate(() => {
      const layout = (window as any).layoutUIStore;
      if (layout) {
        layout.leftSidebarOpen = true;
        layout.activeSidebarTool = "explorer";
      }
    });
    const explorerPanel = page.getByTestId("entity-explorer-panel");
    await expect(explorerPanel).toBeVisible();

    // Find the entity list item
    const entityItem = page.locator(`[data-entity-id="${entityId}"]`);
    await expect(entityItem).toBeVisible();

    // Verify title and label elements exist
    const titleElement = entityItem.getByText(
      "A Very Long Entity Name That Will Wrap On Mobile Screen Width",
    );
    const labelPill = entityItem.getByRole("button", { name: "Quest" });
    await expect(titleElement).toBeVisible();
    await expect(labelPill).toBeVisible();

    // Check vertical coordinates to assert that labels are wrapped below the title
    const titleRect = await titleElement.boundingBox();
    const labelRect = await labelPill.boundingBox();

    expect(titleRect).not.toBeNull();
    expect(labelRect).not.toBeNull();

    // Label should be positioned vertically below the title block (wrapping to second line)
    expect(labelRect!.y).toBeGreaterThanOrEqual(
      titleRect!.y + titleRect!.height,
    );
  });
});

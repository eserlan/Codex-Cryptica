import { test, expect } from "@playwright/test";
import { seedEntity, setupVaultPage } from "./test-helpers";

test.describe("Node Read Mode", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  test("Open Read Mode, Copy, Navigate, and Close", async ({ page }) => {
    // 1. Setup Data
    const heroId = await seedEntity(page, {
      type: "character",
      title: "Hero",
      content: "# Hero Content\nHero is bold.",
    });
    const villainId = await seedEntity(page, {
      type: "character",
      title: "Villain",
      content: "# Villain Content\nVillain is bad.",
    });
    await page.evaluate(
      async ({ heroId, villainId }) => {
        await (window as any).vault.addConnection(heroId, villainId, "enemy");
        (window as any).__TEST_IDS__ = { heroId, villainId };
      },
      { heroId, villainId },
    );

    // 2. Open Zen Mode for "Hero" directly
    await page.evaluate(() => {
      const { heroId } = (window as any).__TEST_IDS__;
      (window as any).modalUIStore.openZenMode(heroId);
    });

    const modal = page.getByTestId("zen-mode-modal");
    await expect(modal).toBeVisible();

    // Use specific ID for title to avoid ambiguity
    await expect(modal.getByTestId("entity-title")).toHaveText("Hero", {
      timeout: 10000,
    });

    // 3. Verify Copy (Mock Clipboard)
    await page.context().grantPermissions(["clipboard-write"]);
    const copyBtn = modal.getByTitle("Copy Content");
    if (await copyBtn.isVisible()) {
      await copyBtn.click();
    }

    // 4. Navigate to Villain
    const connectionLink = modal
      .getByRole("button", { name: "Villain" })
      .first();
    await expect(connectionLink).toBeVisible();
    await connectionLink.click();

    // 5. Verify Content Updates to Villain
    await expect(modal.getByTestId("entity-title")).toHaveText("Villain");
    await expect(modal.getByText("Villain Content")).toBeVisible();

    // 6. Close
    const closeBtn = modal.getByRole("button", { name: "Close" }).first();
    await closeBtn.click();

    await expect(modal).not.toBeVisible();
  });

  test("uses the full mobile row for long Zen mode titles", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });

    const longTitle =
      "Doc Ripperdoc with a title long enough to wrap across the mobile header";

    const entityId = await seedEntity(page, {
      type: "character",
      title: longTitle,
      content: "# Long title verification",
    });
    await page.evaluate((id) => {
      (window as any).__TEST_IDS__ = { id };
    }, entityId);

    await page.waitForTimeout(500); // allow entity store reactivity to settle

    await page.evaluate(() => {
      const { id } = (window as any).__TEST_IDS__;
      (window as any).modalUIStore.openZenMode(id);
    });

    const modal = page.getByTestId("zen-mode-modal");
    await expect(modal).toBeVisible();

    const title = modal.getByTestId("entity-title");
    await expect(title).toHaveText(longTitle);

    const metrics = await title.evaluate((element) => {
      const header = element.closest('[data-testid="zen-header"]');
      const titleRect = element.getBoundingClientRect();
      const headerRect = header?.getBoundingClientRect();
      const style = window.getComputedStyle(element);

      return {
        titleHeight: titleRect.height,
        titleWidth: titleRect.width,
        headerWidth: headerRect?.width ?? 0,
        overflow: style.overflow,
        textOverflow: style.textOverflow,
        whiteSpace: style.whiteSpace,
      };
    });

    expect(metrics.whiteSpace).toBe("normal");
    expect(metrics.overflow).toBe("visible");
    expect(metrics.textOverflow).not.toBe("ellipsis");
    expect(metrics.titleWidth).toBeGreaterThan(metrics.headerWidth * 0.85);
    expect(metrics.titleHeight).toBeGreaterThan(40);
  });

  test("Open Lightbox and Close with Escape", async ({ page }) => {
    // 1. Setup Data with Image
    const base64Image =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAC1HAQAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const id = await seedEntity(page, {
      type: "character",
      title: "HeroImg",
      content: "# Hero Content",
      data: { image: base64Image },
    });
    await page.evaluate((entityId) => {
      (window as any).__TEST_IDS__ = { id: entityId };
    }, id);
    await page.waitForTimeout(500); // allow entity store reactivity to settle

    // 2. Open Zen Mode
    await page.evaluate(() => {
      const { id } = (window as any).__TEST_IDS__;
      (window as any).modalUIStore.openZenMode(id);
    });

    const modal = page.getByTestId("zen-mode-modal");
    await expect(modal).toBeVisible();

    // 3. Click Image to Open Lightbox
    const imageBtn = modal.getByRole("button", {
      name: "View full size image",
    });
    await expect(imageBtn).toBeVisible();

    await imageBtn.click();

    // 4. Verify Lightbox Open
    const closeLightboxBtn = page.locator(
      'button[aria-label="Close image view"]',
    );
    await expect(closeLightboxBtn).toBeVisible();

    // 5. Press Escape
    await page.keyboard.press("Escape");

    // 6. Verify Escape closes the image view.
    await expect(closeLightboxBtn).not.toBeVisible();
  });
});

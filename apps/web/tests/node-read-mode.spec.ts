import { test } from "@playwright/test";

test.describe("Node Read Mode", () => {
  test.beforeEach(async ({ page }) => {
    // Disable onboarding to avoid popup interference
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      localStorage.setItem("codex_skip_landing", "true");
    });
    await page.goto("http://localhost:5173/");
    // Wait for vault to be ready
    await page.waitForFunction(() => (window as any).vault?.status === "idle");
  });

  test("Open Read Mode, Copy, Navigate, and Close", async ({ page }) => {
    // 1. Setup Data
    const { heroId, villainId } = await page.evaluate(async () => {
      const heroId = await (window as any).vault.createEntity(
        "character",
        "Hero",
        {
          content: "# Hero Content\nHero is bold.",
        },
      );
      const villainId = await (window as any).vault.createEntity(
        "character",
        "Villain",
        {
          content: "# Villain Content\nVillain is bad.",
        },
      );

      await (window as any).vault.addConnection(heroId, villainId, "enemy");

      return { heroId, villainId };
    });
    await page.waitForFunction(
      (id) => !!(window as any).vault?.entities?.[id],
      heroId,
    );
    await page.waitForFunction(
      (id) => !!(window as any).vault?.entities?.[id],
      villainId,
    );

    // 2. Open Zen Mode for "Hero" directly
    await page.evaluate((id) => {
      (window as any).uiStore.openZenMode(id);
    }, heroId);

    await page.waitForFunction(
      () => (window as any).uiStore?.showZenMode === true,
    );
    await page.waitForFunction(
      (id) => (window as any).uiStore?.zenModeEntityId === id,
      heroId,
    );

    // 3. Navigate to Villain via state change
    await page.evaluate((id) => {
      (window as any).uiStore.zenModeEntityId = id;
    }, villainId);
    await page.waitForFunction(
      (id) => (window as any).uiStore?.zenModeEntityId === id,
      villainId,
    );

    // 4. Close
    await page.evaluate(() => {
      (window as any).uiStore.closeZenMode();
    });
    await page.waitForFunction(
      () => (window as any).uiStore?.showZenMode === false,
    );
  });

  test("Open Lightbox and Close with Escape", async ({ page }) => {
    // 1. Setup Data with Image
    const id = await page.evaluate(async () => {
      const base64Image =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
      return await (window as any).vault.createEntity("character", "HeroImg", {
        content: "# Hero Content",
        image: base64Image,
      });
    });
    await page.waitForFunction(
      (entityId) => !!(window as any).vault?.entities?.[entityId],
      id,
    );

    // 2. Open Zen Mode
    await page.evaluate((entityId) => {
      (window as any).uiStore.openZenMode(entityId);
    }, id);

    await page.waitForFunction(
      () => (window as any).uiStore?.showZenMode === true,
    );
    await page.waitForFunction(
      (entityId) => (window as any).uiStore?.zenModeEntityId === entityId,
      id,
    );

    // 3. Close Zen Mode
    await page.evaluate(() => {
      (window as any).uiStore.closeZenMode();
    });
    await page.waitForFunction(
      () => (window as any).uiStore?.showZenMode === false,
    );
  });
});

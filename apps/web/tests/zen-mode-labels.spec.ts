import { test, expect } from "@playwright/test";

test.describe("Zen Mode Label Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      localStorage.setItem("codex_skip_landing", "true");
    });

    await page.goto("/");
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 10000,
    });
    await page.evaluate(() => {
      const ui = (window as any).uiStore;
      if (ui) {
        ui.dismissedWorldPage = true;
        ui.dismissedLandingPage = true;
      }
    });
  });

  test("should add and remove labels in Zen Mode", async ({ page }) => {
    // 1. Create a new entity
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Chronicle Title...").fill("Zen Label Test");
    await page.getByRole("button", { name: "ADD" }).click();

    // 2. Open it in Zen Mode
    await page.evaluate(() => {
      const vault = (window as any).vault;
      const entity = Object.values(vault.entities).find(
        (e: any) => e.title === "Zen Label Test",
      );
      if (entity) {
        (window as any).uiStore.openZenMode((entity as any).id);
      }
    });

    const modal = page.getByTestId("zen-mode-modal");
    await expect(modal).toBeVisible();

    // 3. Add a label
    const labelInput = modal.getByPlaceholder("Add label...");
    await expect(labelInput).toBeVisible();
    await labelInput.fill("E2E-Zen-Label");
    await labelInput.press("Enter");

    // 4. Verify label is added
    const labelBadge = modal.getByText("E2E-Zen-Label");
    await expect(labelBadge).toBeVisible();

    // 5. Remove the label
    const removeButton = modal.locator(
      'button[aria-label="Remove label E2E-Zen-Label"]',
    );
    await removeButton.click();

    // 6. Verify label is removed
    await expect(labelBadge).toBeHidden();
  });
});

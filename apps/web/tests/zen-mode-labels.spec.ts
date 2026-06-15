import { test, expect } from "@playwright/test";
import { setupVaultPage } from "./test-helpers";

test.describe("Zen Mode Label Management", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  test("should add and remove labels in Zen Mode", async ({ page }) => {
    // 1. Create a new entity using API
    await page.evaluate(async () => {
      await (window as any).vault.createEntity("note", "Zen Label Test", {
        id: "zen-label-test",
      });
    });

    // 2. Open it in Zen Mode using API
    await page.evaluate(() => {
      (window as any).uiStore.openZenMode("zen-label-test");
    });

    const modal = page.getByTestId("zen-mode-modal");
    await expect(modal).toBeVisible();

    // 3. Add a label
    const labelInput = modal.getByRole("combobox", { name: "Quick add label" });
    await expect(labelInput).toBeVisible();
    await labelInput.fill("e2e-zen-label");
    await labelInput.press("Enter");

    // 4. Verify label is added
    const labelBadge = modal.getByText("e2e-zen-label");
    await expect(labelBadge).toBeVisible();

    // 5. Remove the label
    const removeButton = modal.locator(
      'button[aria-label="Remove label e2e-zen-label"]',
    );
    await removeButton.click();

    // 6. Verify label is removed
    await expect(labelBadge).toBeHidden();
  });
});

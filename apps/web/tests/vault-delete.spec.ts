import { test, expect } from "@playwright/test";
import { setupVaultPage } from "./test-helpers";

test.describe("Vault Node Deletion", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  test("should delete a node and its file", async ({ page }) => {
    // 1. Create a node via API
    await page.evaluate(async () => {
      await (window as any).vault.createEntity("note", "Delete Me", {
        id: "delete-me",
      });
    });

    // 2. Select the entity to open the detail panel
    await page.evaluate(() => {
      (window as any).vault.selectedEntityId = "delete-me";
    });
    await expect(page.getByTestId("entity-detail-panel")).toBeVisible({
      timeout: 5000,
    });

    // 3. Click the delete button
    const deleteButton = page.getByTestId("delete-entity-button");
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // 4. Accept the Svelte confirmation dialog ("Delete permanently")
    const confirmBtn = page.getByRole("button", { name: "Delete permanently" });
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // 5. Verify node is gone
    await page.waitForFunction(
      () => !(window as any).vault?.entities?.["delete-me"],
      { timeout: 5000 },
    );
    await expect(page.getByTestId("entity-detail-panel")).not.toBeVisible();
  });

  test("should cancel deletion", async ({ page }) => {
    // 1. Create a node via API
    await page.evaluate(async () => {
      await (window as any).vault.createEntity("note", "Keep Me", {
        id: "keep-me",
      });
    });

    // 2. Select the entity
    await page.evaluate(() => {
      (window as any).vault.selectedEntityId = "keep-me";
    });
    await expect(page.getByTestId("entity-detail-panel")).toBeVisible({
      timeout: 5000,
    });

    // 3. Click delete, then cancel via Svelte dialog
    await page.getByTestId("delete-entity-button").click();
    const cancelBtn = page.getByRole("button", { name: "Keep entity" });
    await expect(cancelBtn).toBeVisible({ timeout: 5000 });
    await cancelBtn.click();

    // 4. Verify node still exists
    const entity = await page.evaluate(
      () => (window as any).vault?.entities?.["keep-me"],
    );
    expect(entity).toBeTruthy();
    await expect(page.getByTestId("entity-detail-panel")).toBeVisible();
  });
});

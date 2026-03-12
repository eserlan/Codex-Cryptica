import { test, expect } from "@playwright/test";

test.describe("Vault Node Deletion", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).localStorage.setItem("codex_skip_landing", "true");
    });
    // Create a fresh vault for each test if possible, or clear existing
    await page.goto("http://localhost:5173/");
  });

  test("should delete a node and its file", async ({ page }) => {
    // 1. Create a node
    const newButton = page.getByTestId("new-entity-button");
    await newButton.click();
    await page
      .locator('input[placeholder="Chronicle Title..."]')
      .fill("Delete Me");
    await page.getByRole("button", { name: "ADD" }).click();

    // 2. Open the node
    await page.getByText("Delete Me").first().click();
    await expect(page.getByTestId("entity-count")).toBeVisible();

    // 3. Trigger deletion
    const deleteButton = page.getByTestId("delete-entity-button");

    // Handle confirmation dialog
    page.once("dialog", (dialog) => {
      expect(dialog.message()).toContain("Are you sure");
      dialog.accept();
    });

    await deleteButton.click();

    // 4. Verify node is gone from UI
    await expect(page.getByText("Delete Me")).toHaveCount(0);
    await expect(page.getByTestId("entity-detail-panel")).not.toBeVisible();
  });

  test("should cancel deletion", async ({ page }) => {
    // 1. Create a node
    const newButton = page.getByTestId("new-entity-button");
    await newButton.click();
    await page
      .locator('input[placeholder="Chronicle Title..."]')
      .fill("Keep Me");
    await page.getByRole("button", { name: "ADD" }).click();

    // 2. Open the node
    await page.getByText("Keep Me").first().click();

    // 3. Trigger and cancel deletion
    page.once("dialog", (dialog) => {
      dialog.dismiss();
    });

    await page.getByTestId("delete-entity-button").click();

    // 4. Verify node still exists
    await expect(page.getByText("Keep Me").first()).toBeVisible();
    await expect(page.getByTestId("entity-count")).toBeVisible();
  });
});

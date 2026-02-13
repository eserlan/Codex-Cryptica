import { test, expect } from "@playwright/test";

test.describe("Vault Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
    });
    await page.goto("/");
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should rename and delete a vault", async ({ page }) => {
    // 1. Create temporary vault
    await page.getByTitle("Switch Vault").click();
    await page.getByRole("button", { name: "NEW VAULT" }).click();
    const vaultName = `Temp-${Date.now()}`;
    await page.getByPlaceholder("Vault Name...").fill(vaultName);
    await page.getByRole("button", { name: "CREATE" }).click();

    await expect(page.getByTitle("Switch Vault")).toContainText(vaultName);

    // 2. Switch away so we can modify it
    await page.getByTitle("Switch Vault").click();
    const modal = page.getByTestId("vault-switcher-modal");
    const defaultRow = modal
      .getByRole("button", { name: /Default Vault|Local Vault/ })
      .first();
    await defaultRow.click();

    // Reopen switcher
    await page.getByTitle("Switch Vault").click();

    // 3. Rename
    // Finds the row by text initially
    const vaultRow = modal.locator(".group", { hasText: vaultName }).last();
    await vaultRow.hover();
    await vaultRow.getByTitle("Rename").click();

    const newName = `${vaultName}-Renamed`;
    // Find the input that now contains the old name
    const input = modal
      .locator("input")
      .filter({ hasNot: modal.getByPlaceholder("Vault Name...") })
      .first();
    await input.fill(newName);
    // Find the submit button next to it (inside the form)
    await modal.locator('button[type="submit"]').first().click();

    await expect(page.getByText(newName)).toBeVisible();
    await expect(page.getByText(vaultName, { exact: true })).not.toBeVisible();

    // 4. Delete
    const renamedRow = page.locator(".group", { hasText: newName }).last();
    await renamedRow.hover();
    await renamedRow.getByTitle("Delete").click();

    await expect(page.getByText("DELETE VAULT?")).toBeVisible();
    await page.getByRole("button", { name: "DELETE FOREVER" }).click();

    await expect(page.getByText("DELETE VAULT?")).not.toBeVisible();
    await expect(
      modal.locator(".group", { hasText: newName }),
    ).not.toBeVisible();
  });
});

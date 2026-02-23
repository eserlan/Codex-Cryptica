import { test, expect } from "@playwright/test";

test.describe("Vault Switching Accessibility", () => {
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
  });

  test("action buttons should be accessible via keyboard and have proper labels", async ({ page }) => {
    // Create a second vault so the original vault becomes non-active and exposes its Delete button
    await page.getByTestId("open-vault-button").click();
    await expect(page.getByText("VAULT SELECTOR")).toBeVisible();
    await page.getByRole("button", { name: "NEW VAULT" }).click();
    await page.getByPlaceholder("Vault Name...").fill("A11yTestVault");
    await page.getByRole("button", { name: "CREATE" }).click();

    // Re-open the vault switcher (creating a vault closes the modal)
    await page.getByTestId("open-vault-button").click();
    await expect(page.getByText("VAULT SELECTOR")).toBeVisible();

    const modal = page.getByTestId("vault-switcher-modal");

    // Check that buttons are discoverable by role + accessible name (confirms aria-label)
    const renameButtons = modal.getByRole("button", { name: "Rename" });
    const restoreButtons = modal.getByRole("button", { name: "Restore from Folder" });
    const deleteButtons = modal.getByRole("button", { name: "Delete" });

    await expect(renameButtons.first()).toBeAttached();
    await expect(restoreButtons.first()).toBeAttached();
    await expect(deleteButtons.first()).toBeAttached();

    // Scope to the non-active vault row (the only row that has a Delete button)
    const nonActiveRow = modal
      .locator(".group")
      .filter({ has: modal.getByRole("button", { name: "Delete" }) })
      .first();

    const restoreBtn = nonActiveRow.getByRole("button", { name: "Restore from Folder" });
    const renameBtn = nonActiveRow.getByRole("button", { name: "Rename" });
    const deleteBtn = nonActiveRow.getByRole("button", { name: "Delete" });

    // Verify keyboard reachability and focus-driven visibility for Rename
    // Tab from Restore (which precedes Rename in tab order) to Rename
    await restoreBtn.focus();
    await page.keyboard.press("Tab");
    await expect(renameBtn).toBeFocused();
    await expect(renameBtn).toHaveCSS("opacity", "1");

    // Verify keyboard reachability and focus-driven visibility for Delete
    // Tab from Rename (which precedes Delete in tab order) to Delete
    await renameBtn.focus();
    await page.keyboard.press("Tab");
    await expect(deleteBtn).toBeFocused();
    await expect(deleteBtn).toHaveCSS("opacity", "1");

    // Check New Vault Name input has accessible label
    await page.getByRole("button", { name: "NEW VAULT" }).click();
    const input = page.getByRole("textbox", { name: "New Vault Name" });
    await expect(input).toBeVisible();
    await input.fill("Accessible Vault");
  });
});

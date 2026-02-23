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
    // Open vault switcher
    await page.getByTestId("open-vault-button").click();
    await expect(page.getByText("VAULT SELECTOR")).toBeVisible();

    const modal = page.getByTestId("vault-switcher-modal");

    // Check that we can find buttons by their aria-label
    // This confirms aria-label is present
    const renameButtons = modal.getByRole("button", { name: "Rename" });
    const restoreButtons = modal.getByRole("button", { name: "Restore from Folder" });

    await expect(renameButtons.first()).toBeAttached();
    await expect(restoreButtons.first()).toBeAttached();

    // Check focus visibility
    const firstRenameBtn = renameButtons.first();
    await firstRenameBtn.focus();
    await expect(firstRenameBtn).toHaveCSS("opacity", "1");

    // Check New Vault Name input
    const newVaultBtn = page.getByRole("button", { name: "NEW VAULT" });
    await newVaultBtn.click();

    const input = page.getByRole("textbox", { name: "New Vault Name" });
    await expect(input).toBeVisible();
    await input.focus();
    await input.fill("Accessible Vault");
  });
});

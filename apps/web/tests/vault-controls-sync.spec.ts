import { test, expect } from "@playwright/test";

test.describe("Vault Controls Sync Button", () => {
  test.beforeEach(async ({ page }) => {
    // Basic setup to ensure we're on a page with VaultControls
    await page.addInitScript(() => ((window as any).DISABLE_ONBOARDING = true));

    // Start a demo to ensure we have a populated vault and VaultControls are visible
    // Using URL param is more reliable than evaluating window.demoService
    await page.goto("/?demo=fantasy");

    // Wait for the vault to be loaded (Demo Mode badge appears)
    await expect(page.getByText("DEMO MODE")).toBeVisible();
  });

  test("should display the Sync button with correct initial state", async ({
    page,
  }) => {
    // The button might be in the sidebar (vertical) or top bar (horizontal)
    // We look for a button with text "SYNC" or "SYNC TO FOLDER"
    const syncButton = page.getByRole("button", { name: /SYNC/i }).first();

    await expect(syncButton).toBeVisible();
    await expect(syncButton).toBeEnabled();

    // Check for the initial icon (download)
    // We can't easily check for the class without more specific selectors,
    // but we can check it doesn't have the loading spinner initially.
    await expect(syncButton).not.toHaveClass(/animate-spin/);
  });
});

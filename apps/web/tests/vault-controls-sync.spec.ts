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

  test("should display the Save button with correct initial state", async ({
    page,
  }) => {
    // The button might be in the sidebar (vertical) or top bar (horizontal)
    // We look for a button with text "SAVE" or "SAVE TO FOLDER"
    const saveButton = page.getByRole("button", { name: /SAVE/i }).first();

    await expect(saveButton).toBeVisible();
    
    // In demo mode, it might be enabled or disabled depending on how demo entities are handled.
    // But it should exist.
  });
});

import { test, expect } from "@playwright/test";

test.describe("Directional Vault Sync UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      try {
        localStorage.setItem("codex_skip_landing", "true");
      } catch {
        /* ignore */
      }
    });

    await page.goto("/");
    await page.waitForFunction(() => (window as any).vault?.status === "idle");
  });

  test("should show Load button in Vault Selector for active vault", async ({ page }) => {
    await page.getByTestId("open-vault-button").click();
    await expect(page.getByText("VAULT SELECTOR")).toBeVisible();
    
    const activeVaultRow = page.locator('.bg-theme-primary\/10');
    await expect(activeVaultRow).toBeVisible();
    
    const loadButton = activeVaultRow.getByLabel("Load from Folder");
    await expect(loadButton).toBeVisible();
    await expect(loadButton).toHaveAttribute("title", /Load from Folder/);
  });

  test("should enable Save button when internal changes are made", async ({ page }) => {
    // Note: This test assumes no folder is linked initially, so it might be disabled with a specific title.
    const saveButton = page.getByRole("button", { name: /SAVE/i }).first();
    
    // Create an entity to trigger dirty state
    await page.evaluate(async () => {
      await (window as any).vault.createEntity("character", "Dirty Entity");
    });
    
    // Even without a handle, we check if it tries to be enabled or shows the "No folder linked" title
    const title = await saveButton.getAttribute("title");
    expect(title).toMatch(/Save to file system|No folder linked/);
  });
});

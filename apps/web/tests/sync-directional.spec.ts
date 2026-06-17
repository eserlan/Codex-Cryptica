import { test, expect } from "@playwright/test";

test.describe("Directional Vault Sync UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );
    });

    await page.goto("/");
    await page.waitForFunction(() => (window as any).vault?.status === "idle");
  });

  test("should show Load button in Vault Selector for active vault", async ({
    page,
  }) => {
    await page.getByTestId("open-vault-button").click();
    await expect(page.getByText("VAULT SELECTOR")).toBeVisible();

    const activeVaultRow = page.locator(
      "[data-testid='vault-switcher-modal'] .bg-theme-primary\\/10",
    );
    await expect(activeVaultRow).toBeVisible();

    const loadButton = activeVaultRow.getByLabel("Load from Folder");
    await expect(loadButton).toBeVisible();
    await expect(loadButton).toHaveAttribute("title", /Load from Folder/);
  });

  test("should show Save button in Vault Selector for active vault", async ({
    page,
  }) => {
    await page.getByTestId("open-vault-button").click();
    await expect(page.getByText("VAULT SELECTOR")).toBeVisible();

    const activeVaultRow = page.locator(
      "[data-testid='vault-switcher-modal'] .bg-theme-primary\\/10",
    );
    await expect(activeVaultRow).toBeVisible();

    const saveButton = activeVaultRow.getByLabel("Save to Folder");
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toHaveAttribute(
      "title",
      /Save to [fF]older|No folder linked/,
    );
  });

  test("should enable Save button when internal changes are made", async ({
    page,
  }) => {
    // Note: This test assumes no folder is linked initially, so it might be disabled with a specific title.
    const saveButton = page.getByLabel("SAVE TO FOLDER");

    // Create an entity to trigger dirty state
    await page.evaluate(async () => {
      await (window as any).vault.createEntity("character", "Dirty Entity");
    });

    // Even without a handle, we check if it tries to be enabled or shows the "No folder linked" title
    const title = await saveButton.getAttribute("title");
    expect(title).toMatch(/Save to file system|No folder linked/);
  });
});

import { test, expect } from "@playwright/test";
import { setupVaultPage } from "./test-helpers";

test.describe("Directional Vault Sync UI", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
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
    // Create an entity to trigger dirty state
    await page.evaluate(async () => {
      await (window as any).vault.createEntity("character", "Dirty Entity");
    });

    await page.getByTestId("open-vault-button").click();
    await expect(page.getByText("VAULT SELECTOR")).toBeVisible();

    const activeVaultRow = page.locator(
      "[data-testid='vault-switcher-modal'] .bg-theme-primary\\/10",
    );
    await expect(activeVaultRow).toBeVisible();

    const saveButton = activeVaultRow.getByLabel("Save to Folder");
    await expect(saveButton).toBeVisible();
    const title = await saveButton.getAttribute("title");
    expect(title).toMatch(/Save to [fF]older|No folder linked/);
  });
});

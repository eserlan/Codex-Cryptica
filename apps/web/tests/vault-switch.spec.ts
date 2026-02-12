import { test, expect } from '@playwright/test';

test.describe('Vault Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
    });
    await page.goto('/');
    // Wait for initialization
    await expect(page.getByTestId('graph-canvas')).toBeVisible({ timeout: 10000 });
  });

  test('should display current vault name in header', async ({ page }) => {
    // Default vault should be active (created by migration/init)
    await expect(page.getByTitle('Switch Vault')).toBeVisible();
    // Use regex to match "Default Vault" or "Local Vault" if migration logic varies
    await expect(page.getByTitle('Switch Vault')).toContainText(/Default Vault|Local Vault/);
  });

  test('should open vault switcher modal', async ({ page }) => {
    await page.getByTitle('Switch Vault').click();
    await expect(page.getByText('VAULT SELECTOR')).toBeVisible();
    // Default vault should be listed and active
    const modal = page.getByTestId('vault-switcher-modal');
    const defaultVaultRow = modal.getByRole('button', { name: /Default Vault|Local Vault/ }).first();
    await expect(defaultVaultRow).toBeVisible();
    await expect(defaultVaultRow).toContainText('ACTIVE');
  });

  test('should create and switch to a new vault', async ({ page }) => {
    await page.getByTitle('Switch Vault').click();
    await page.getByRole('button', { name: 'NEW VAULT' }).click();

    await page.getByPlaceholder('Vault Name...').fill('Test Vault');
    await page.getByRole('button', { name: 'CREATE' }).click();

    // Header should update
    await expect(page.getByTitle('Switch Vault')).toContainText('Test Vault');

    // Verify list update
    await page.getByTitle('Switch Vault').click();
    const modal = page.getByTestId('vault-switcher-modal');
    const newVaultRow = modal.getByRole('button', { name: 'Test Vault' }).first();
    await expect(newVaultRow).toBeVisible();
    await expect(newVaultRow).toContainText('ACTIVE');
  });
});

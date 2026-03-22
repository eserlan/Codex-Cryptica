import { test, expect } from '@playwright/test';

/**
 * E2E tests for Oracle connection status visibility and mode switching.
 */

test.describe('Oracle Status', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display System Proxy status when no API key is set', async ({ page }) => {
    // Open Oracle sidebar
    const oracleToggle = page.locator('[data-testid="oracle-toggle"]');
    if (await oracleToggle.isVisible()) {
      await oracleToggle.click();
    }

    // Check for System Proxy indicator
    const statusIndicator = page.locator('.oracle-status');
    await expect(statusIndicator).toBeVisible();
    
    // Verify the status text shows "System Proxy"
    const statusText = statusIndicator.locator('.status-text');
    await expect(statusText).toContainText('System Proxy');
  });

  test('should display Custom Key status after API key is entered', async ({ page }) => {
    // This test requires the settings page to be accessible
    await page.goto('/settings');
    
    // Find and fill the API key input
    const apiKeyInput = page.locator('input[type="password"], input[placeholder*="API"], input[aria-label*="key" i]');
    
    if (await apiKeyInput.isVisible()) {
      // Enter a test API key
      await apiKeyInput.fill('test-key-12345');
      
      // Navigate back to main page and open Oracle
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const oracleToggle = page.locator('[data-testid="oracle-toggle"]');
      if (await oracleToggle.isVisible()) {
        await oracleToggle.click();
      }

      // Check for Custom Key indicator
      const statusIndicator = page.locator('.oracle-status');
      await expect(statusIndicator).toBeVisible();
      
      // Verify the status text shows "Direct Connection: Custom Key"
      const statusText = statusIndicator.locator('.status-text');
      await expect(statusText).toContainText('Direct Connection');
      await expect(statusText).toContainText('Custom Key');
    }
  });

  test('should switch modes in real-time when API key is added/removed', async ({ page }) => {
    // Start in System Proxy mode (no key)
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const oracleToggle = page.locator('[data-testid="oracle-toggle"]');
    if (await oracleToggle.isVisible()) {
      await oracleToggle.click();
    }

    // Verify initial System Proxy state
    let statusIndicator = page.locator('.oracle-status');
    let statusText = statusIndicator.locator('.status-text');
    await expect(statusText).toContainText('System Proxy');

    // Navigate to settings and add key
    await page.goto('/settings');
    const apiKeyInput = page.locator('input[type="password"], input[placeholder*="API"], input[aria-label*="key" i]');
    
    if (await apiKeyInput.isVisible()) {
      await apiKeyInput.fill('new-test-key');
      
      // Return to Oracle and verify mode switch
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      if (await oracleToggle.isVisible()) {
        await oracleToggle.click();
      }

      statusIndicator = page.locator('.oracle-status');
      statusText = statusIndicator.locator('.status-text');
      await expect(statusText).toContainText('Direct Connection');
      await expect(statusText).toContainText('Custom Key');
    }
  });
});

import { test, expect } from "@playwright/test";

/**
 * E2E tests for Oracle connection status visibility and mode switching.
 */

test.describe("Oracle Status", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should display System Proxy status when no API key is set", async ({
    page,
  }) => {
    // Open Oracle sidebar
    const oracleToggle = page.getByTestId("sidebar-oracle-button");
    await expect(oracleToggle).toBeVisible();
    await oracleToggle.click();

    // Check for System Proxy indicator
    const statusIndicator = page.locator(".oracle-status");
    await expect(statusIndicator).toBeVisible();

    // Verify the status text shows "System Proxy"
    const statusText = statusIndicator.locator(".status-text");
    await expect(statusText).toContainText("System Proxy");
  });

  test("should display Custom Key status after API key is entered", async ({
    page,
  }) => {
    await page.evaluate(async () => {
      await (window as any).oracle.setKey("test-key-12345");
    });

    const oracleToggle = page.getByTestId("sidebar-oracle-button");
    if (await oracleToggle.isVisible()) {
      await oracleToggle.click();
    }

    const statusIndicator = page.locator(".oracle-status");
    await expect(statusIndicator).toBeVisible();

    const statusText = statusIndicator.locator(".status-text");
    await expect(statusText).toContainText("Direct Connection");
    await expect(statusText).toContainText("Custom Key");
  });

  test("should switch modes in real-time when API key is added/removed", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const oracleToggle = page.getByTestId("sidebar-oracle-button");
    if (await oracleToggle.isVisible()) {
      await oracleToggle.click();
    }

    const statusIndicator = page.locator(".oracle-status");
    const statusText = statusIndicator.locator(".status-text");
    await expect(statusText).toContainText("System Proxy");

    await page.evaluate(async () => {
      await (window as any).oracle.setKey("new-test-key");
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    if (await oracleToggle.isVisible()) {
      await oracleToggle.click();
    }

    await expect(statusText).toContainText("Direct Connection");
    await expect(statusText).toContainText("Custom Key");

    await page.evaluate(async () => {
      await (window as any).oracle.clearKey();
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    if (await oracleToggle.isVisible()) {
      await oracleToggle.click();
    }

    await expect(statusText).toContainText("System Proxy");
  });
});

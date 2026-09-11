import { test, expect } from "@playwright/test";
import { setupVaultPage, openOracle, seedEntity } from "./test-helpers";

test.describe("AI Disabled", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  test("Toggle AI Disabled ON removes AI entry points and silences network", async ({
    page,
  }) => {
    // 1. Setup network interception
    let aiCallDetected = false;
    await page.route(
      "**/generativelanguage.googleapis.com/**",
      async (route) => {
        aiCallDetected = true;
        await route.abort();
      },
    );

    // 2. Open Settings and Toggle AI Disabled
    await page.getByTestId("settings-button").click();
    await page.getByRole("tab", { name: /^AI$/i }).click();

    const aiDisabledToggle = page.getByLabel(/AI Disabled/i);
    await expect(aiDisabledToggle).toBeVisible();
    await aiDisabledToggle.check();

    // 3. Close Settings
    await page.getByLabel("Close Settings").click();

    // 4. Create an entity and verify "Draw" button is hidden
    await seedEntity(page, {
      title: "AIDisabledHero",
      content: "Just a hero.",
      type: "character",
      select: true,
    });

    // Verify "Draw" button is NOT visible
    const drawButton = page.locator('button[aria-label*="Draw visualization"]');
    await expect(drawButton).not.toBeVisible();

    // Verify Oracle suggestions are NOT visible
    const suggestionsHeader = page.getByText(/Oracle Suggestions/i);
    await expect(suggestionsHeader).not.toBeVisible();

    // 5. Interact with Oracle and verify network silence
    await openOracle(page);
    const oracleInput = page.getByTestId("oracle-input");
    await oracleInput.fill("Hello AI");
    await page.keyboard.press("Enter");

    // Wait a bit for potential network calls
    await page.waitForTimeout(1000);

    expect(aiCallDetected).toBe(false);

    // Verify "AI DISABLED" indicator in Oracle header
    const aiDisabledIndicator = page
      .locator('[data-testid="oracle-sidebar-panel"]')
      .getByText("AI DISABLED", { exact: true })
      .first();
    await expect(aiDisabledIndicator).toBeVisible();
  });

  test("Restricted Oracle supports /help command", async ({ page }) => {
    // 1. Enable AI Disabled
    await page.getByTestId("settings-button").click();
    await page.getByRole("tab", { name: /^AI$/i }).click();
    await page.getByLabel(/AI Disabled/i).check();
    await page.getByLabel("Close Settings").click();

    // 2. Open Oracle
    await openOracle(page);
    await expect(
      page.locator('[data-testid="oracle-sidebar-panel"]'),
    ).toBeVisible();

    // 3. Trigger help via store (UI Enter key is flaky in tests)
    await page.evaluate(() => (window as any).oracle.ask("/help"));

    // 4. Verify help content
    await expect(page.getByText(/Restricted Mode Active/i)).toBeVisible();
    await expect(page.getByText("/connect")).toBeVisible();
    await expect(page.getByText("/merge")).toBeVisible();
  });

  test("Oracle supports /help command in AI mode", async ({ page }) => {
    // 1. Open Oracle
    await openOracle(page);
    await expect(
      page.locator('[data-testid="oracle-sidebar-panel"]'),
    ).toBeVisible();

    // 2. Trigger help via store
    await page.evaluate(() => (window as any).oracle.ask("/help"));

    // 3. Verify help content (AI Guide)
    await expect(page.getByText(/Oracle Command Guide/i)).toBeVisible();
    await expect(page.getByText("/draw")).toBeVisible();
    await expect(page.locator('code:has-text("/create")')).toHaveCount(2);
  });

  test("AI Disabled persists across reloads", async ({ page }) => {
    // 1. Enable AI Disabled
    await page.getByTestId("settings-button").click();
    await page.getByRole("tab", { name: /^AI$/i }).click();
    await page.getByLabel(/AI Disabled/i).check();
    await page.getByLabel("Close Settings").click();

    // 2. Reload page
    await page.reload();
    await page.waitForFunction(() => (window as any).vault?.status === "idle");

    // 3. Verify it's still ON
    await page.getByTestId("settings-button").click();
    await page.getByRole("tab", { name: /^AI$/i }).click();
    await expect(page.getByLabel(/AI Disabled/i)).toBeChecked();
  });
});

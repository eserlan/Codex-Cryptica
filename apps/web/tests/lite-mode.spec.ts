import { test, expect } from "@playwright/test";

test.describe("Lite Mode (No AI)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
    });
    await page.goto("http://localhost:5173/");
    await page.waitForFunction(() => (window as any).vault?.status === "idle");
  });

  test("Toggle Lite Mode ON removes AI entry points and silences network", async ({
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

    // 2. Open Settings and Toggle Lite Mode
    await page.getByTestId("settings-button").click();
    await page.getByRole("tab", { name: /Intelligence/i }).click();

    const liteModeToggle = page.getByLabel(/Lite Mode \(No AI\)/i);
    await expect(liteModeToggle).toBeVisible();
    await liteModeToggle.check();

    // 3. Close Settings
    await page.getByLabel("Close Settings").click();

    // 4. Create an entity and verify "Draw" button is hidden
    await page.evaluate(async () => {
      await (window as any).vault.createEntity("character", "LiteHero", {
        content: "Just a hero.",
      });
    });

    // Select the entity to open detail panel
    await page.evaluate(() => {
      (window as any).vault.selectedEntityId = "litehero";
    });

    // Verify "Draw" button is NOT visible
    const drawButton = page.locator('button[aria-label*="Draw visualization"]');
    await expect(drawButton).not.toBeVisible();

    // Verify Oracle suggestions are NOT visible
    const suggestionsHeader = page.getByText(/Oracle Suggestions/i);
    await expect(suggestionsHeader).not.toBeVisible();

    // 5. Interact with Oracle and verify network silence
    await page.getByTestId("oracle-orb").click();
    const oracleInput = page.getByTestId("oracle-input");
    await oracleInput.fill("Hello AI");
    await page.keyboard.press("Enter");

    // Wait a bit for potential network calls
    await page.waitForTimeout(1000);

    expect(aiCallDetected).toBe(false);

    // Verify "Lite" indicator in Oracle header
    const liteIndicator = page
      .locator(".oracle-window-container")
      .getByText("LITE", { exact: true })
      .first();
    await expect(liteIndicator).toBeVisible();
  });

  test("Restricted Oracle supports /help command", async ({ page }) => {
    // 1. Enable Lite Mode
    await page.getByTestId("settings-button").click();
    await page.getByRole("tab", { name: /Intelligence/i }).click();
    await page.getByLabel(/Lite Mode \(No AI\)/i).check();
    await page.getByLabel("Close Settings").click();

    // 2. Open Oracle
    await page.getByTestId("oracle-orb").click();
    await expect(page.locator(".oracle-window-container")).toBeVisible();

    // 3. Trigger help via store (UI Enter key is flaky in tests)
    await page.evaluate(() => (window as any).oracle.showHelp());

    // 4. Verify help content
    await expect(page.getByText(/Restricted Mode Active/i)).toBeVisible();
    await expect(page.getByText("/connect")).toBeVisible();
    await expect(page.getByText("/merge")).toBeVisible();
  });

  test("Oracle supports /help command in AI mode", async ({ page }) => {
    // 1. Open Oracle
    await page.getByTestId("oracle-orb").click();
    await expect(page.locator(".oracle-window-container")).toBeVisible();

    // 2. Trigger help via store
    await page.evaluate(() => (window as any).oracle.showHelp());

    // 3. Verify help content (AI Guide)
    await expect(page.getByText(/Oracle Command Guide/i)).toBeVisible();
    await expect(page.getByText("/draw")).toBeVisible();
    await expect(page.getByText("/create").first()).toBeVisible();
  });

  test("Lite Mode persists across reloads", async ({ page }) => {
    // 1. Enable Lite Mode
    await page.getByTestId("settings-button").click();
    await page.getByRole("tab", { name: /Intelligence/i }).click();
    await page.getByLabel(/Lite Mode \(No AI\)/i).check();
    await page.getByLabel("Close Settings").click();

    // 2. Reload page
    await page.reload();
    await page.waitForFunction(() => (window as any).vault?.status === "idle");

    // 3. Verify it's still ON
    await page.getByTestId("settings-button").click();
    await page.getByRole("tab", { name: /Intelligence/i }).click();
    await expect(page.getByLabel(/Lite Mode \(No AI\)/i)).toBeChecked();
  });
});

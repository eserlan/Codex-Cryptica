import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

test.describe("Blog Screenshots: Oracle Capabilities", () => {
  const outputDir = path.join(
    process.cwd(),
    "../../blogPics/oracle-capabilities",
  );

  test.beforeAll(() => {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      (window as any).__SHARED_GEMINI_KEY__ = "fake-test-key";
      localStorage.setItem("codex_skip_landing", "true");
    });
    await page.goto("http://localhost:5173/");

    // Wait for vault to be idle
    await page.waitForFunction(() => (window as any).vault?.status === "idle", {
      timeout: 15000,
    });

    // Open Oracle sidebar
    const toggleBtn = page.getByTestId("sidebar-oracle-button");
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();

    // Wait for oracle panel to be visible
    await expect(
      page.locator('[data-testid="oracle-sidebar-panel"]'),
    ).toBeVisible();

    // Wait for input to be ready
    await expect(page.locator('[data-testid="oracle-input"]')).toBeVisible();

    // Dismiss the "Oracle Connection Modes" modal if it appears
    const gotItButton = page.getByRole("button", { name: "GOT IT" });
    if (await gotItButton.isVisible()) {
      await gotItButton.click();
      await page.waitForTimeout(500);
    }
  });

  test("01 - Oracle Hero Interface", async ({ page }) => {
    // Set consistent viewport
    await page.setViewportSize({ width: 1200, height: 800 });

    // Wait a bit for any animations
    await page.waitForTimeout(500);

    // Capture the full oracle sidebar
    const oraclePanel = page.locator('[data-testid="oracle-sidebar-panel"]');
    await oraclePanel.screenshot({
      path: path.join(outputDir, "oracle-capabilities-hero.png"),
    });
  });

  test("02 - Dice Roll Command", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });

    // Type roll command
    const input = page.locator('[data-testid="oracle-input"]');
    await input.fill("/roll 1d20+5");
    await page.keyboard.press("Enter");

    // Wait for roll result to appear
    await page.waitForTimeout(2000);

    // Capture the oracle sidebar showing both command and result
    const oraclePanel = page.locator('[data-testid="oracle-sidebar-panel"]');
    await oraclePanel.screenshot({
      path: path.join(outputDir, "oracle-roll-command.png"),
    });
  });

  test("03 - Create Entity Command", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });

    // Type create command
    const input = page.locator('[data-testid="oracle-input"]');
    await input.fill('/create "Mira Valdris" as "Character"');
    await page.keyboard.press("Enter");

    // Wait for creation confirmation
    await page.waitForTimeout(2000);

    // Capture
    const oraclePanel = page.locator('[data-testid="oracle-sidebar-panel"]');
    await oraclePanel.screenshot({
      path: path.join(outputDir, "oracle-create-command.png"),
    });
  });

  test("04 - Connect Entities Command", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });

    // First, create two entities to connect
    const input = page.locator('[data-testid="oracle-input"]');

    // Create first entity
    await input.fill('/create "Mira Valdris" as "Character"');
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2000);

    // Create second entity
    await input.fill('/create "The Iron Compact" as "Faction"');
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2000);

    // Now connect them
    await input.fill(
      '/connect "Mira Valdris" owes a debt to "The Iron Compact"',
    );
    await page.keyboard.press("Enter");

    // Wait for connection
    await page.waitForTimeout(2000);

    // Capture
    const oraclePanel = page.locator('[data-testid="oracle-sidebar-panel"]');
    await oraclePanel.screenshot({
      path: path.join(outputDir, "oracle-connect-command.png"),
    });
  });

  test("05 - Slash Command Menu", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });

    // Trigger slash menu
    const input = page.locator('[data-testid="oracle-input"]');
    await input.click();
    await input.fill("/");

    // Wait for menu to appear
    await page.waitForTimeout(1000);

    // Capture the oracle sidebar with command menu
    const oraclePanel = page.locator('[data-testid="oracle-sidebar-panel"]');
    await oraclePanel.screenshot({
      path: path.join(outputDir, "oracle-command-menu.png"),
    });
  });
});

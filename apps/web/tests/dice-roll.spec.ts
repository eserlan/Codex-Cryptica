import { test, expect } from "@playwright/test";

test.describe("Dice Rolling (Oracle Command)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      try {
        localStorage.setItem("codex_skip_landing", "true");
      } catch {
        /* ignore */
      }
      try {
        localStorage.setItem("codex_lite_mode", "true");
      } catch {
        /* ignore */
      }
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    // Dismiss landing page if visible
    const enterBtn = page.getByRole("button", { name: /ENTER THE CODEX/i });
    if (await enterBtn.isVisible()) {
      await enterBtn.click();
    }

    // Wait for actual UI to be ready
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("dice-roller-button")).toBeVisible({
      timeout: 30000,
    });

    // Open Oracle if not already open
    const oracleSidebar = page.getByTestId("oracle-sidebar-panel");
    if (!(await oracleSidebar.isVisible())) {
      const oracleBtn = page.getByTitle("Open Lore Oracle");
      await oracleBtn.click({ force: true });
    }

    await expect(oracleSidebar).toBeVisible({
      timeout: 15000,
    });
  });

  test("should perform a basic d20 roll via /roll command", async ({
    page,
  }) => {
    const input = page.getByTestId("oracle-input");
    await expect(input).toBeVisible({ timeout: 30000 });
    await input.focus();
    await input.fill("/roll d20");
    await input.press("Enter");

    // Check for roll result message (rich component labels)
    const resultMsg = page.locator('[data-testid="chat-message"]').last();
    await expect(resultMsg).toContainText("Result", { timeout: 15000 });
    await expect(resultMsg).toContainText("Formula", { timeout: 15000 });

    const content = await resultMsg.textContent();
    expect(content).toContain("d20");
  });

  test("should handle complex formulas with modifiers", async ({ page }) => {
    const input = page.getByTestId("oracle-input");
    await expect(input).toBeVisible({ timeout: 30000 });
    await input.focus();
    await input.fill("/roll 2d6 + 10");
    await input.press("Enter");

    const resultMsg = page.locator('[data-testid="chat-message"]').last();
    await expect(resultMsg).toContainText("Result", { timeout: 15000 });

    const content = await resultMsg.textContent();
    // In rich component, the total is prominent.
    // Let's just verify the formula is there.
    expect(content).toContain("2d6 + 10");
  });

  test("should show error for invalid formula", async ({ page }) => {
    const input = page.getByTestId("oracle-input");
    await expect(input).toBeVisible({ timeout: 30000 });
    await input.focus();
    await input.fill("/roll invalid");
    await input.press("Enter");

    const errorMsg = page.locator('[data-testid="chat-message"]').last();
    // Errors still use the system message content block
    await expect(errorMsg).toContainText("Roll failed", { timeout: 15000 });
  });
});

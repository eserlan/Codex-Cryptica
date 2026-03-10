import { test, expect } from "@playwright/test";

test.describe("Dice Modal UI and Isolation", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem("codex_lite_mode", "true");
    });

    await page.goto("/");

    // Dismiss landing page if visible
    const enterBtn = page.getByRole("button", { name: /ENTER THE CODEX/i });
    if (await enterBtn.isVisible()) {
      await enterBtn.click();
    }

    // Wait for actual UI to be ready
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("dice-roller-button")).toBeVisible({
      timeout: 15000,
    });
  });

  test("should open modal and perform a quick roll", async ({ page }) => {
    // 1. Open Modal
    await page.getByTestId("dice-roller-button").click({ force: true });
    const modal = page.getByTestId("dice-modal");
    await expect(modal).toBeVisible({ timeout: 15000 });

    // 2. Click d20 button
    await modal.getByRole("button", { name: /d20/i }).click({ force: true });

    // 3. Verify it appears in the modal's session history
    const historyItem = modal
      .getByTestId("roll-formula")
      .filter({ hasText: "1d20" });
    await expect(historyItem).toBeVisible({ timeout: 10000 });
  });

  test("should perform a custom roll in modal", async ({ page }) => {
    await page.getByTestId("dice-roller-button").click({ force: true });
    const modal = page.getByTestId("dice-modal");
    await expect(modal).toBeVisible({ timeout: 15000 });

    const input = modal.getByPlaceholder(/Enter formula/i);
    await input.fill("3d6 + 5");
    await modal
      .getByRole("button", { name: "ROLL", exact: true })
      .click({ force: true });

    const historyItem = modal
      .getByTestId("roll-formula")
      .filter({ hasText: "3d6 + 5" });
    await expect(historyItem).toBeVisible({ timeout: 10000 });
  });

  test("should accumulate dice on multiple quick clicks", async ({ page }) => {
    await page.getByTestId("dice-roller-button").click({ force: true });
    const modal = page.getByTestId("dice-modal");

    const d6Button = modal.getByRole("button", { name: /d6/i });

    // Click 3 times quickly
    await d6Button.click({ force: true });
    await d6Button.click({ force: true });
    await d6Button.click({ force: true });

    // Wait for the accumulator timeout (400ms) to flush
    await page.waitForTimeout(1000);

    // Verify it rolled 3d6
    const historyItem = modal
      .getByTestId("roll-formula")
      .filter({ hasText: "3d6" });
    await expect(historyItem).toBeVisible();
  });

  test("should reroll a previous formula", async ({ page }) => {
    await page.getByTestId("dice-roller-button").click({ force: true });
    const modal = page.getByTestId("dice-modal");

    // 1. Perform initial roll
    await modal.getByRole("button", { name: /d20/i }).click({ force: true });
    await expect(
      modal.getByTestId("roll-formula").filter({ hasText: "1d20" }),
    ).toHaveCount(1);

    // 2. Click reroll button
    const rerollBtn = modal
      .locator('button[title="Reroll this formula"]')
      .first();
    await rerollBtn.click({ force: true });

    // 3. Verify there are now two d20 rolls in history
    await expect(
      modal.getByTestId("roll-formula").filter({ hasText: "1d20" }),
    ).toHaveCount(2);
  });

  test("should scroll to top when rerolling from the bottom", async ({
    page,
  }) => {
    // Set a smaller viewport to ensure scrolling happens
    await page.setViewportSize({ width: 1000, height: 600 });

    await page.getByTestId("dice-roller-button").click({ force: true });
    const modal = page.getByTestId("dice-modal");

    // 1. Fill history with many rolls
    const input = modal.getByPlaceholder(/Enter formula/i);
    const rollBtn = modal.getByRole("button", { name: "ROLL", exact: true });

    for (let i = 0; i < 40; i++) {
      await input.fill(`1d${i + 2}`);
      await rollBtn.click({ force: true });
    }

    const scrollContainer = modal.locator(".overflow-y-auto");

    // 2. Scroll to the bottom
    await scrollContainer.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });

    // Wait for DOM
    await page.waitForTimeout(1000);

    // Verify we are actually scrolled down
    const scrollTopBefore = await scrollContainer.evaluate(
      (el) => el.scrollTop,
    );
    expect(scrollTopBefore).toBeGreaterThan(0);

    // 3. Reroll the oldest roll (at the bottom)
    const oldestRerollBtn = modal
      .locator('button[title="Reroll this formula"]')
      .last();
    await oldestRerollBtn.scrollIntoViewIfNeeded();
    await oldestRerollBtn.click({ force: true });

    // 4. Wait for scroll and verify we are back at the top
    await expect
      .poll(
        async () => {
          return await scrollContainer.evaluate((el) => el.scrollTop);
        },
        { timeout: 5000 },
      )
      .toBe(0);
  });

  test("should isolate modal rolls from Oracle chat", async ({ page }) => {
    // 1. Open Oracle
    const oracleBtn = page.getByTitle("Open Lore Oracle");
    if (await oracleBtn.isVisible()) {
      await oracleBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }

    // 2. Open Dice Modal and roll
    await page.getByTestId("dice-roller-button").click({ force: true });
    const modal = page.getByTestId("dice-modal");
    await expect(modal).toBeVisible({ timeout: 15000 });
    await modal.getByRole("button", { name: /d100/i }).click({ force: true });

    // 3. Close Modal (press Escape or click backdrop)
    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible();

    // 4. Verify Oracle chat does NOT contain the d100 roll result
    // Use the chat-message test ID for reliability
    const oracleMessage = page.locator('[data-testid="chat-message"]', {
      hasText: /1d100/,
    });
    await expect(oracleMessage).not.toBeVisible();
  });
});

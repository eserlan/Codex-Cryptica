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

    // Clear dice history directly from IndexedDB
    await page.evaluate(async () => {
      return new Promise<void>((resolve) => {
        const request = indexedDB.open("CodexCryptica");
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (db.objectStoreNames.contains("dice_history")) {
            const transaction = db.transaction("dice_history", "readwrite");
            transaction.objectStore("dice_history").clear();
            transaction.oncomplete = () => {
              db.close();
              resolve();
            };
          } else {
            db.close();
            resolve();
          }
        };
        request.onerror = () => resolve();
      });
    });

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

  test("should build formula and perform a roll", async ({ page }) => {
    // 1. Open Modal
    await page.getByTestId("dice-roller-button").click({ force: true });
    const modal = page.getByTestId("dice-modal");
    await expect(modal).toBeVisible({ timeout: 15000 });

    // 2. Click d20 button (builds formula)
    await modal.getByRole("button", { name: /d20/i }).click({ force: true });

    // 3. Click ROLL button
    await modal
      .getByRole("button", { name: "ROLL", exact: true })
      .click({ force: true });

    // 4. Verify it appears in the modal's session history (case-insensitive for 'uppercase' styling)
    const historyItem = modal
      .getByTestId("roll-formula")
      .filter({ hasText: /1d20/i });
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
      .filter({ hasText: /3d6 \+ 5/i });
    await expect(historyItem).toBeVisible({ timeout: 10000 });
  });

  test("should increment dice count on multiple clicks", async ({ page }) => {
    await page.getByTestId("dice-roller-button").click({ force: true });
    const modal = page.getByTestId("dice-modal");

    const d6Button = modal.getByRole("button", { name: /d6/i });
    const input = modal.getByPlaceholder(/Enter formula/i);

    // Click 3 times
    await d6Button.click({ force: true });
    await d6Button.click({ force: true });
    await d6Button.click({ force: true });

    // Verify input contains 3d6
    await expect(input).toHaveValue("3d6");

    // Click ROLL
    await modal
      .getByRole("button", { name: "ROLL", exact: true })
      .click({ force: true });

    // Verify it rolled 3d6
    const historyItem = modal
      .getByTestId("roll-formula")
      .filter({ hasText: /3d6/i });
    await expect(historyItem).toBeVisible();
  });

  test("should navigate history using Arrow keys", async ({ page }) => {
    await page.getByTestId("dice-roller-button").click({ force: true });
    const modal = page.getByTestId("dice-modal");
    const input = modal.getByPlaceholder(/Enter formula/i);

    // 1. Perform two different rolls
    await input.fill("1d4");
    await modal
      .getByRole("button", { name: "ROLL", exact: true })
      .click({ force: true });
    await expect(
      modal.getByTestId("roll-formula").filter({ hasText: /1d4/i }).first(),
    ).toBeVisible();

    // Tiny delay to ensure different timestamps
    await page.waitForTimeout(100);

    await input.fill("2d8");
    await modal
      .getByRole("button", { name: "ROLL", exact: true })
      .click({ force: true });
    await expect(
      modal.getByTestId("roll-formula").filter({ hasText: /2d8/i }).first(),
    ).toBeVisible();

    // 2. Press ArrowUp to get "2d8" (the last roll)
    await input.focus();
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(200);
    await expect(input).toHaveValue("2d8");

    // 3. Press ArrowUp again to get "1d4" (the one before)
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(200);
    await expect(input).toHaveValue("1d4");

    // 4. Press ArrowDown to get back to "2d8"
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(200);
    await expect(input).toHaveValue("2d8");
  });

  test("should NOT close modal when pressing space in input", async ({
    page,
  }) => {
    await page.getByTestId("dice-roller-button").click({ force: true });
    const modal = page.getByTestId("dice-modal");
    const input = modal.getByPlaceholder(/Enter formula/i);

    await input.focus();
    await page.keyboard.press("Space");

    // Modal should still be visible
    await expect(modal).toBeVisible();
  });

  test("should reroll a previous formula", async ({ page }) => {
    await page.getByTestId("dice-roller-button").click({ force: true });
    const modal = page.getByTestId("dice-modal");

    // 1. Perform initial roll (Build + ROLL)
    await modal.getByRole("button", { name: /d20/i }).click({ force: true });
    await modal
      .getByRole("button", { name: "ROLL", exact: true })
      .click({ force: true });

    // Check for the formula badge - using locator directly to be sure
    const formulaBadge = page
      .locator('[data-testid="roll-formula"]')
      .filter({ hasText: /1d20/i });
    // Wait for the card to be fully rendered
    await expect(formulaBadge.first()).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    // 2. Click reroll button
    // It's inside the roll card.
    const rerollBtn = page
      .locator('button[title="Reroll this formula"]')
      .first();
    await rerollBtn.click({ force: true });

    // 3. Verify there are now two rolls in history
    await expect(formulaBadge).toHaveCount(2, { timeout: 10000 });
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

    for (let i = 0; i < 20; i++) {
      await input.fill(`1d${i + 2}`);
      await rollBtn.click({ force: true });
      // Wait for each roll to ensure order and persistence
      await expect(modal.getByTestId("roll-formula").first()).toBeVisible();
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

    // Build + ROLL
    await modal.getByRole("button", { name: /d100/i }).click({ force: true });
    await modal
      .getByRole("button", { name: "ROLL", exact: true })
      .click({ force: true });

    // Wait for history
    await expect(
      modal.getByTestId("roll-formula").filter({ hasText: /1d100/i }),
    ).toBeVisible();

    // 3. Close Modal (press Escape)
    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible();

    // 4. Verify Oracle chat does NOT contain the d100 roll result
    const oracleMessage = page.locator('[data-testid="chat-message"]', {
      hasText: /1d100/i,
    });
    await expect(oracleMessage).not.toBeVisible();
  });
});

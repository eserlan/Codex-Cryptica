import { test, expect } from "@playwright/test";

test.describe("Dice Modal UI and Isolation", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      localStorage.setItem("codex_skip_landing", "true");
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

    // Wait for auto-init
    await page.waitForFunction(() => (window as any).vault?.status === "idle");

    // Wait for actual UI to be ready
    await expect(page.getByTestId("dice-roller-button")).toBeVisible({
      timeout: 15000,
    });
  });

  test("should build formula and perform a roll", async ({ page }) => {
    // 1. Open Modal
    await page.getByTestId("dice-roller-button").click();
    const modal = page.getByTestId("dice-modal");
    await expect(modal).toBeVisible({ timeout: 15000 });

    // 2. Click d20 button (builds formula)
    await modal.getByRole("button", { name: /d20/i }).click({ force: true });

    // 3. Click ROLL button
    await modal
      .getByRole("button", { name: "ROLL", exact: true })
      .click({ force: true });

    // 4. Verify it appears in the modal's session history
    const historyItem = modal
      .getByTestId("roll-formula")
      .filter({ hasText: /1d20/i });
    await expect(historyItem).toBeVisible({ timeout: 10000 });
  });

  test("should perform a custom roll in modal", async ({ page }) => {
    await page.getByTestId("dice-roller-button").click();
    const modal = page.getByTestId("dice-modal");
    await expect(modal).toBeVisible({ timeout: 15000 });

    const input = modal.getByPlaceholder(/Enter formula/i);
    await input.fill("3d6 + 5");
    await input.press("Enter");

    const historyItem = modal
      .getByTestId("roll-formula")
      .filter({ hasText: /3d6 \+ 5/i });
    await expect(historyItem).toBeVisible({ timeout: 10000 });
  });

  test("should navigate history using Arrow keys", async ({ page }) => {
    await page.getByTestId("dice-roller-button").click();
    const modal = page.getByTestId("dice-modal");
    await expect(modal).toBeVisible();
    const input = modal.getByPlaceholder(/Enter formula/i);

    // 1. Perform two different rolls
    await input.fill("1d4");
    await input.press("Enter");
    await expect(
      modal.getByTestId("roll-formula").filter({ hasText: /1d4/i }).first(),
    ).toBeVisible();

    await page.waitForTimeout(500); // Give it time to breathe

    await input.fill("2d8");
    await input.press("Enter");
    await expect(
      modal.getByTestId("roll-formula").filter({ hasText: /2d8/i }).first(),
    ).toBeVisible();

    await page.waitForTimeout(500);

    // 2. Press ArrowUp to get "2d8" (the last roll)
    await input.focus();
    await page.keyboard.press("ArrowUp");
    await expect(input).toHaveValue("2d8");

    // 3. Press ArrowUp again to get "1d4" (the one before)
    await page.keyboard.press("ArrowUp");
    await expect(input).toHaveValue("1d4");

    // 4. Press ArrowDown to get back to "2d8"
    await page.keyboard.press("ArrowDown");
    await expect(input).toHaveValue("2d8");
  });

  test("should scroll to top when rerolling from the bottom", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1000, height: 600 });
    await page.getByTestId("dice-roller-button").click();
    const modal = page.getByTestId("dice-modal");
    await expect(modal).toBeVisible();

    const input = modal.getByPlaceholder(/Enter formula/i);
    for (let i = 0; i < 15; i++) {
      await input.fill(`1d${i + 2}`);
      await input.press("Enter");
      await page.waitForTimeout(50);
    }

    const scrollContainer = modal.locator(".overflow-y-auto");
    await scrollContainer.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });

    await page.waitForTimeout(500);
    const scrollTopBefore = await scrollContainer.evaluate(
      (el) => el.scrollTop,
    );
    expect(scrollTopBefore).toBeGreaterThan(0);

    const oldestRerollBtn = modal
      .locator('button[title="Reroll this formula"]')
      .last();
    await oldestRerollBtn.scrollIntoViewIfNeeded();
    await oldestRerollBtn.click({ force: true });

    await expect
      .poll(
        async () => {
          return await scrollContainer.evaluate((el) => el.scrollTop);
        },
        { timeout: 5000 },
      )
      .toBe(0);
  });
});

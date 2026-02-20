import { test, expect } from "@playwright/test";

test.describe("Sync Reminder System", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("codex_skip_landing", "true");
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
    });

    await page.goto("/");

    // Wait for vault to initialize
    await page.waitForFunction(
      () => (window as any).vault?.isInitialized === true,
    );

    // Set sync folder as configured
    await page.evaluate(() => {
      (window as any).vault.hasSyncFolder = true;
    });
  });

  test("should show reminder after 5 changes", async ({ page }) => {
    // reminder should not be visible initially
    await expect(page.getByText("Unsynced Changes")).not.toBeVisible();

    // Create 5 entities
    for (let i = 1; i <= 5; i++) {
      await page.getByTestId("new-entity-button").click();
      await page.getByPlaceholder(/Title\.\.\./).fill(`Test Entity ${i}`);
      await page.getByRole("button", { name: "ADD" }).click();
      // Small delay to ensure state updates
      await page.waitForTimeout(100);
    }

    // Reminder should now be visible
    await expect(page.getByText("Unsynced Changes")).toBeVisible();
    await expect(page.getByText(/You have 5 unsynced/)).toBeVisible();
  });

  test("should dismiss reminder and re-appear after 5 more changes", async ({
    page,
  }) => {
    // 1. Trigger first reminder
    for (let i = 1; i <= 5; i++) {
      await page.getByTestId("new-entity-button").click();
      await page.getByPlaceholder(/Title\.\.\./).fill(`A ${i}`);
      await page.getByRole("button", { name: "ADD" }).click();
      await page.waitForTimeout(50);
    }
    await expect(page.getByText("Unsynced Changes")).toBeVisible();

    // 2. Dismiss it
    await page.getByRole("button", { name: "DISMISS" }).click();
    await expect(page.getByText("Unsynced Changes")).not.toBeVisible();

    // 3. Add 4 more (total 9) - should NOT show
    for (let i = 1; i <= 4; i++) {
      await page.getByTestId("new-entity-button").click();
      await page.getByPlaceholder(/Title\.\.\./).fill(`B ${i}`);
      await page.getByRole("button", { name: "ADD" }).click();
      await page.waitForTimeout(50);
    }
    await expect(page.getByText("Unsynced Changes")).not.toBeVisible();

    // 4. Add 1 more (total 10) - should show
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder(/Title\.\.\./).fill(`C 1`);
    await page.getByRole("button", { name: "ADD" }).click();

    await expect(page.getByText("Unsynced Changes")).toBeVisible();
    await expect(page.getByText(/You have 10 unsynced/)).toBeVisible();
  });
});

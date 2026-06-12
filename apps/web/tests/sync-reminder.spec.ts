import { test, expect } from "@playwright/test";

// Sync reminder feature was removed from the app; skip until re-implemented
test.describe.skip("Sync Reminder System", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("codex_skip_landing", "true");
      } catch {
        /* ignore */
      }
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );
    });

    await page.goto("/");

    // Wait for vault to initialize
    await page.waitForFunction(
      () => (window as any).vault?.isInitialized === true,
    );

    // Simulate a configured sync folder in tests without requiring the real
    // File System Access API or running through the actual sync folder setup UI.
    await page.evaluate(() => {
      (window as any).vault.hasSyncFolder = true;
    });
  });

  test("should show reminder after 5 changes", async ({ page }) => {
    // reminder should not be visible initially
    await expect(page.getByText("Unsynced Changes")).not.toBeVisible();

    // Create 5 entities via API to trigger change counter
    for (let i = 1; i <= 5; i++) {
      await page.evaluate(async (n) => {
        await (window as any).vault.createEntity("note", `Test Entity ${n}`);
      }, i);
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
      await page.evaluate(async (n) => {
        await (window as any).vault.createEntity("note", `A ${n}`);
      }, i);
      await page.waitForTimeout(50);
    }
    await expect(page.getByText("Unsynced Changes")).toBeVisible();

    // 2. Dismiss it
    await page.getByRole("button", { name: "DISMISS" }).click();
    await expect(page.getByText("Unsynced Changes")).not.toBeVisible();

    // 3. Add 4 more (total 9) - should NOT show
    for (let i = 1; i <= 4; i++) {
      await page.evaluate(async (n) => {
        await (window as any).vault.createEntity("note", `B ${n}`);
      }, i);
      await page.waitForTimeout(50);
    }
    await expect(page.getByText("Unsynced Changes")).not.toBeVisible();

    // 4. Add 1 more (total 10) - should show
    await page.evaluate(async () => {
      await (window as any).vault.createEntity("note", "C 1");
    });

    await expect(page.getByText("Unsynced Changes")).toBeVisible();
    await expect(page.getByText(/You have 10 unsynced/)).toBeVisible();
  });
});

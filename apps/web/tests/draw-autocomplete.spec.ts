import { test, expect } from "@playwright/test";
import { openOracle, seedEntities, setupVaultPage } from "./test-helpers";

test.describe("Draw Command Autocomplete", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );
      (window as any).__SHARED_GEMINI_KEY__ = "fake-key";
    });
    await setupVaultPage(page);
    await seedEntities(page, [
      { title: "Ancient Dragon" },
      { title: "Mystic Forest" },
    ]);

    // Wait for indexing to complete (2 entries)
    await expect(page.getByTestId("entity-count")).toHaveText(/2\s+NOTES/, {
      timeout: 20000,
    });

    // Open Oracle Window
    await openOracle(page);
  });

  test("Autocompletes /draw command", async ({ page }) => {
    const input = page.getByTestId("oracle-input");
    await expect(input).toBeVisible();

    // 1. Trigger Command via menu
    await input.type("/");
    await expect(page.getByText("SUBJECT", { exact: true })).not.toBeVisible();

    // Select /draw
    await input.type("dra");
    await page.keyboard.press("Tab");

    // Check input is /draw
    await expect(input).toHaveValue("/draw ");

    // Check header shows SUBJECT is active
    await expect(page.getByText("SUBJECT", { exact: true })).toHaveClass(
      /text-theme-primary/,
    );

    // 2. Select Subject
    await input.type("Anc");
    await expect(
      page.locator('button:has-text("Ancient Dragon")'),
    ).toBeVisible();
    await page.keyboard.press("Enter");

    // Final verification
    await expect(input).toHaveValue('/draw "Ancient Dragon" ');
  });
});

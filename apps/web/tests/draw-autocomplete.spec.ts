import { test, expect } from "@playwright/test";

test.describe("Draw Command Autocomplete", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__SHARED_GEMINI_KEY__ = "fake-key";
      localStorage.setItem("codex_skip_landing", "true");
    });
    await page.goto("http://localhost:5173/");

    // Create entities via UI to trigger indexing
    await page.getByTestId("new-entity-button").click();
    await expect(page.getByPlaceholder("Chronicle Title...")).toBeVisible();
    await page.getByPlaceholder("Chronicle Title...").fill("Ancient Dragon");
    await page.getByRole("button", { name: "ADD" }).click();

    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Chronicle Title...").fill("Mystic Forest");
    await page.getByRole("button", { name: "ADD" }).click();

    // Wait for indexing to complete (2 entries)
    await expect(page.getByTestId("entity-count")).toHaveText(
      /2\s+CHRONICLES/,
      {
        timeout: 20000,
      },
    );

    // Open Oracle Window
    const toggleBtn = page.getByTitle("Open Lore Oracle");
    await toggleBtn.click();
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

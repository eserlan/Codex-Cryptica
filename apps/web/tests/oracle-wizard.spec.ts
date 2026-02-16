import { test, expect } from "@playwright/test";

test.describe("Oracle Connection Wizard", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__SHARED_GEMINI_KEY__ = "fake-key";
    });
    await page.goto("http://localhost:5173/");

    // Create entities via UI to trigger indexing
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Eldrin");
    await page.getByRole("button", { name: "ADD" }).click();

    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Tower");
    await page.getByRole("button", { name: "ADD" }).click();

    // Wait for indexing to complete (2 entries)
    await expect(page.getByTestId("entity-count")).toHaveText("2 ENTITIES", {
      timeout: 20000,
    });

    // Open Oracle Window
    const toggleBtn = page.getByTitle("Open Lore Oracle");
    await toggleBtn.click();
  });

  test("Guided sequence: FROM -> LABEL -> TO", async ({ page }) => {
    const input = page.getByTestId("oracle-input");
    await expect(input).toBeVisible();

    // 1. Trigger Command via menu
    await input.type("/");
    await expect(page.getByText("FROM", { exact: true })).toBeVisible();

    // Select /connect
    await input.type("con");
    await page.keyboard.press("Tab");

    // Check input is /connect
    await expect(input).toHaveValue("/connect ");

    // Check header shows FROM is active
    await expect(page.getByText("FROM", { exact: true })).toHaveClass(
      /text-theme-primary/,
    );

    // 2. Select FROM
    await input.type("Eld");
    await expect(page.locator('button:has-text("Eldrin")')).toBeVisible();
    await page.keyboard.press("Tab");

    // Verify step change to LABEL
    await expect(page.getByText("LABEL", { exact: true })).toHaveClass(
      /text-theme-primary/,
    );

    // 3. Type LABEL
    await input.type("is the master of");
    await page.keyboard.press("Tab");

    // Verify step change to TO
    await expect(page.getByText("TO", { exact: true })).toHaveClass(
      /text-theme-primary/,
    );

    // 4. Select TO
    await input.type("Tow");
    await expect(page.locator('button:has-text("Tower")')).toBeVisible();
    await page.keyboard.press("Enter");

    // Final verification
    await expect(input).toHaveValue(
      '/connect "Eldrin" is the master of "Tower" ',
    );
  });

  test("Using thematic suggestions for LABEL", async ({ page }) => {
    const input = page.getByTestId("oracle-input");
    await expect(input).toBeVisible();

    // 1. Start command
    await input.fill('/connect "Eldrin" ');

    // Check we are at LABEL
    await expect(page.getByText("LABEL", { exact: true })).toHaveClass(
      /text-theme-primary/,
    );

    // 2. See suggestions
    await expect(page.locator("text=is the leader of")).toBeVisible();
    await page.keyboard.press("ArrowDown"); // Select second suggestion ("is the rival of")
    await page.keyboard.press("Tab");

    // Verify input and step change to TO
    await expect(input).toHaveValue('/connect "Eldrin" is the rival of "');
    await expect(page.getByText("TO", { exact: true })).toHaveClass(
      /text-theme-primary/,
    );
  });
});

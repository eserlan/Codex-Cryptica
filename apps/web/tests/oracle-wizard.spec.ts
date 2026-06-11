import { test, expect } from "@playwright/test";

test.describe("Oracle Connection Wizard", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );
      (window as any).__SHARED_GEMINI_KEY__ = "fake-key";
    });
    await page.goto("/");

    // Wait for vault to be ready
    await page.waitForFunction(() => (window as any).vault?.status === "idle", {
      timeout: 15000,
    });

    // Open Oracle first so searchService subscribes to events before entity creation
    const toggleBtn = page.getByTestId("activity-bar-oracle");
    await toggleBtn.click();
    await page.getByTestId("oracle-input").waitFor({ state: "visible" });

    // Now create entities so search index picks them up
    await page.evaluate(async () => {
      const v = (window as any).vault;
      await v.createEntity("character", "Eldrin");
      await v.createEntity("location", "Tower");
    });

    // Wait for entities to be in vault and search-indexed
    await page.waitForFunction(
      async () => {
        const v = (window as any).vault;
        if (!v || Object.keys(v.entities || {}).length < 2) return false;
        const s = (window as any).searchStore;
        if (!s?.search) return true; // searchStore not set — skip check
        try {
          const results = await s.search("Eld", { limit: 5 });
          return Array.isArray(results) && results.length > 0;
        } catch {
          return true; // If error, proceed anyway
        }
      },
      { timeout: 20000 },
    );
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
    await expect(page.locator('button:has-text("Eldrin")')).toBeVisible({
      timeout: 10000,
    });
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
    await expect(page.locator('button:has-text("Tower")')).toBeVisible({
      timeout: 10000,
    });
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

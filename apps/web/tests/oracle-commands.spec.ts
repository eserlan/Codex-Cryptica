import { test, expect } from "@playwright/test";

test.describe("Oracle Chat Commands", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );
    });
    await page.goto("/");

    // Wait for vault to be idle
    await page.waitForFunction(() => (window as any).vault?.status === "idle", {
      timeout: 15000,
    });

    // Open Oracle Window
    const toggleBtn = page.getByTestId("activity-bar-oracle");
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();

    // Wait for the app to initialize
    await page.waitForFunction(
      () => {
        const oracle = (window as any).oracle;
        return oracle && oracle.isInitialized;
      },
      { timeout: 15000 },
    );
  });

  test("Slash Command Menu discovery", async ({ page }) => {
    const input = page.getByTestId("oracle-input");
    await expect(input).toBeVisible();
    await input.fill("/");

    await expect(page.getByText("FROM", { exact: true })).toBeVisible();

    await expect(page.locator("text=/draw").first()).toBeVisible();
    await expect(page.locator("text=/create").first()).toBeVisible();
    await expect(page.locator("text=/connect").first()).toBeVisible();

    // Test filtering
    await input.type("con");
    await expect(page.locator("text=/draw").first()).not.toBeVisible();
    await expect(page.locator("text=/connect").first()).toBeVisible();

    // Test selection
    await page.keyboard.press("Enter");
    await expect(input).toHaveValue("/connect ");
  });

  test("Connection Wizard flow", async ({ page }) => {
    const input = page.getByTestId("oracle-input");
    await expect(input).toBeVisible();
    await input.fill("/connect oracle");
    await page.keyboard.press("Enter");

    await expect(page.locator("text=Connection Wizard")).toBeVisible();
    await expect(
      page.locator("text=1. Select the origin entity"),
    ).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";
import { setupVaultPage } from "./test-helpers";

test.describe("Changelog System", () => {
  test("should automatically open when a new version is detected", async ({
    page,
  }) => {
    // 1. Setup with an older version in localStorage
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      localStorage.setItem("codex_last_seen_version", "0.17.0");
      localStorage.setItem("codex_skip_landing", "true");
    });

    await page.goto("/");

    // 2. Verify modal appears after the 2s delay
    // We wait up to 5s to be safe
    const modal = page.locator('div[role="dialog"] >> text=What\'s New');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // 3. Close the modal
    await page.getByRole("button", { name: "Acknowledge Updates" }).click();
    await expect(modal).not.toBeVisible();

    // 4. Verify version is updated in localStorage
    const lastSeen = await page.evaluate(() =>
      localStorage.getItem("codex_last_seen_version"),
    );
    expect(lastSeen).toBe("0.17.37");
  });

  test("should NOT automatically open when version is up to date", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      localStorage.setItem("codex_last_seen_version", "0.17.37");
      localStorage.setItem("codex_skip_landing", "true");
    });

    await page.goto("/");

    // Wait 3s to ensure the 2s timeout would have fired
    await page.waitForTimeout(3000);

    const modal = page.locator('div[role="dialog"] >> text=What\'s New');
    await expect(modal).not.toBeVisible();
  });

  test("should open manually from Settings even if up to date", async ({
    page,
  }) => {
    await setupVaultPage(page);

    // Ensure we are up to date
    await page.evaluate(() => {
      localStorage.setItem("codex_last_seen_version", "0.17.37");
    });

    // 1. Open Settings
    await page.keyboard.press("Control+,");
    await expect(page.getByTestId("settings-modal")).toBeVisible();

    // 2. Go to About tab
    await page.getByRole("tab", { name: "About" }).click();

    // 3. Click What's New
    await page.getByTestId("show-changelog-button").click();

    // 4. Verify modal appears (with "Recent Updates" title since we're up to date)
    const modal = page.locator('div[role="dialog"] >> text=Recent Updates');
    await expect(modal).toBeVisible();

    // 5. Verify it shows the latest version from releases.json
    await expect(page.locator("text=v0.17.37")).toBeVisible();

    // 6. Close via Escape key
    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible();
  });
});

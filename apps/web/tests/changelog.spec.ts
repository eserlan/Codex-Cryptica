import { test, expect } from "@playwright/test";
import releases from "../src/lib/content/changelog/releases.json" with { type: "json" };
import { setupVaultPage } from "./test-helpers";

const LATEST_VERSION = releases[0].version;

test.describe("Changelog System", () => {
  test("should automatically open when a new MINOR version is detected", async ({
    page,
  }) => {
    // 1. Setup with an older MINOR version in localStorage
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );
      localStorage.setItem("codex_last_seen_version", "0.25.1");
    });

    await setupVaultPage(page);

    // 2. Verify modal appears after the 2s delay
    // We wait up to 5s to be safe
    const modal = page.locator('div[role="dialog"] >> text=What\'s New');
    await expect(modal).toBeVisible({ timeout: 8000 });

    // 3. Close the modal
    await page.getByRole("button", { name: "Acknowledge Updates" }).click();
    await expect(modal).not.toBeVisible();

    // 4. Verify version is updated in localStorage
    const lastSeen = await page.evaluate(() =>
      localStorage.getItem("codex_last_seen_version"),
    );
    // Should match the latest known release from releases.json.
    expect(lastSeen).toBe(LATEST_VERSION);
  });

  test("should NOT automatically open when MINOR version is up to date (even if patch is older)", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );
      // Stored version is 0.26.0, current app is 0.26.x.
      // Because minor is the same, it should NOT pop up.
      localStorage.setItem("codex_last_seen_version", "0.26.0");
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
    await page.evaluate((v) => {
      localStorage.setItem("codex_last_seen_version", v);
    }, LATEST_VERSION);

    // 1. Open Settings
    await page.getByTestId("settings-button").click();
    await expect(page.getByTestId("settings-modal")).toBeVisible();

    // 2. Go to About tab
    await page.getByRole("tab", { name: "About" }).click();

    // 3. Click What's New
    await page.getByTestId("show-changelog-button").click();

    // 4. Verify modal appears (with "Recent Updates" title since we're up to date)
    const modal = page.locator('div[role="dialog"] >> text=Recent Updates');
    await expect(modal).toBeVisible();

    // 5. Verify it shows the latest version from releases.json
    await expect(page.locator(`text=v${LATEST_VERSION}`)).toBeVisible();

    // 6. Close via the modal's explicit action
    await page.getByRole("button", { name: "Done" }).click();
    await expect(modal).not.toBeVisible();
  });
});

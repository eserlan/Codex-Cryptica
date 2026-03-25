import { test, expect } from "@playwright/test";

test.describe("Interactive Demo Mode", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      (window as any).__SHARED_GEMINI_KEY__ = "fake-key";
      localStorage.removeItem("codex_was_converted");
      localStorage.removeItem("codex_active_vault_id");
    });
  });

  test("should start demo from landing page", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "false");
    });

    await page.goto("/?s=" + Date.now());
    await page.waitForFunction(
      () =>
        (window as any).uiStore !== undefined &&
        (window as any).vault !== undefined,
    );

    await page.evaluate(() => {
      (window as any).uiStore.dismissedLandingPage = false;
      if ((window as any).vault) (window as any).vault.status = "idle";
    });

    // Verify landing page visible
    await expect(page.getByText("Build Your World.")).toBeVisible({
      timeout: 15000,
    });

    // Click Try Demo
    await page.getByRole("button", { name: "Try Demo" }).click();

    // Wait for demo mode state
    await page.waitForFunction(
      () =>
        (window as any).uiStore.isDemoMode &&
        (window as any).vault.status === "idle" &&
        (window as any).vault.demoVaultName &&
        (window as any).vault.demoVaultName.includes("Fantasy"),
      { timeout: 15000 },
    );

    // Demo mode badge should be visible
    await expect(page.getByText("DEMO MODE")).toBeVisible();

    // Sample data should be loaded - check entity count as indicator of successful load
    const count = page.getByTestId("entity-count");
    await expect(count).toBeVisible({ timeout: 15000 });
    await expect(count).toContainText(/7|8/);
  });

  test("should start theme-specific demo via URL", async ({ page }) => {
    // For URL-based demo, we want to bypass landing page
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
    });

    await page.goto("/?demo=vampire&s=" + Date.now());
    await page.waitForFunction(
      () =>
        (window as any).uiStore !== undefined &&
        (window as any).vault !== undefined,
    );

    // Wait for demo detection and loading
    await page.waitForFunction(
      () =>
        (window as any).uiStore?.isDemoMode &&
        (window as any).vault?.status === "idle" &&
        (window as any).vault.demoVaultName &&
        (window as any).vault.demoVaultName.toLowerCase().includes("horror"),
      { timeout: 15000 },
    );

    // Demo badge visible
    await expect(page.getByText("DEMO MODE")).toBeVisible();

    // Theme should have changed - check for horror-specific jargon if possible,
    // or just verify that entities loaded
    const count = page.getByTestId("entity-count");
    await expect(count).toBeVisible({ timeout: 15000 });
    await expect(count).toContainText(/7|8/);
  });

  test("should prevent data persistence in demo mode", async ({ page }) => {
    await page.goto("/?demo=fantasy&s=" + Date.now());
    await page.waitForFunction(
      () =>
        (window as any).uiStore?.isDemoMode &&
        (window as any).vault?.status === "idle",
      { timeout: 15000 },
    );

    // Add a new entity
    await page.getByTestId("new-entity-button").click();
    const input = page.locator('input[placeholder*="Title..."]');
    await expect(input).toBeVisible();
    await input.fill("New Transient Node");
    await page.getByRole("button", { name: "ADD" }).click();

    // Wait for indexing
    await page.waitForTimeout(1000);

    // Open search to find the new node
    await page.keyboard.press("Control+k");
    const searchInput = page.locator('input[placeholder*="..."]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill("New Transient Node");

    // Indicator should show transient mode in the detail panel
    await page
      .getByTestId("search-result")
      .filter({ hasText: "New Transient Node" })
      .first()
      .click();
    await expect(page.getByText(/TRANSIENT MODE/)).toBeVisible();

    // Reload page
    await page.reload();
    await page.waitForFunction(() => (window as any).uiStore !== undefined, {
      timeout: 15000,
    });

    // Node should be gone
    await page.keyboard.press("Control+k");
    const searchInput2 = page.locator('input[placeholder*="..."]').first();
    await expect(searchInput2).toBeVisible();
    await searchInput2.fill("New Transient Node");
    await expect(page.getByTestId("search-result")).not.toBeVisible();
  });

  test("should convert demo to real campaign", async ({ page }) => {
    await page.goto("/?demo=fantasy&s=" + Date.now());
    await page.waitForFunction(
      () =>
        (window as any).uiStore?.isDemoMode &&
        (window as any).vault?.status === "idle",
      { timeout: 15000 },
    );

    // Click Save as Campaign button directly from the toolbar
    const saveBtn = page.getByTestId("save-as-campaign-button");
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // Notification should appear
    await expect(page.getByText(/SAVED SUCCESSFULLY/i)).toBeVisible({
      timeout: 10000,
    });

    // Demo badge should be gone
    await expect(page.getByText("DEMO MODE")).not.toBeVisible();
  });
});

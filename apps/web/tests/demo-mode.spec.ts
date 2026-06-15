import { test, expect } from "@playwright/test";

test.describe("Interactive Demo Mode", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("codex_skip_landing");
      localStorage.removeItem("codex_dismissed_landing");
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );
      (window as any).__SHARED_GEMINI_KEY__ = "fake-key";
      try {
        localStorage.removeItem("codex_was_converted");
      } catch {
        /* ignore */
      }
      try {
        localStorage.removeItem("codex_active_vault_id");
      } catch {
        /* ignore */
      }
    });
  });

  test("should start demo from landing page", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.removeItem("codex_skip_landing");
        localStorage.removeItem("codex_dismissed_landing");
      } catch {
        /* ignore */
      }
    });

    await page.goto("/?s=" + Date.now());
    await page.waitForFunction(
      () =>
        (window as any).uiStore !== undefined &&
        (window as any).vault !== undefined,
    );

    await page.evaluate(() => {
      (window as any).onboardingStore.dismissedLandingPage = false;
      (window as any).onboardingStore.skipWelcomeScreen = false;
      if ((window as any).vault) (window as any).vault.status = "idle";
    });

    // Verify landing page visible
    await expect(
      page.getByRole("heading", { name: "Private RPG Lore Vault" }),
    ).toBeVisible({ timeout: 15000 });

    // Click Explore Demo Vault
    await page.getByTestId("welcome-demo-button").click();

    // Wait for demo mode state
    await page.waitForFunction(
      () =>
        (window as any).sessionModeStore.isDemoMode &&
        (window as any).vault.status === "idle" &&
        (window as any).vault.demoVaultName &&
        (window as any).vault.demoVaultName.includes("Fantasy"),
      { timeout: 15000 },
    );

    // Demo mode badge should be visible
    await expect(page.getByText("DEMO MODE", { exact: true })).toBeVisible();

    // Sample data should be loaded - check entity count as indicator of successful load
    const count = page.getByTestId("entity-count");
    await expect(count).toBeVisible({ timeout: 15000 });
    await expect(count).toContainText(/7|8/);
  });

  test("should start theme-specific demo via URL", async ({ page }) => {
    // For URL-based demo, we want to bypass landing page
    await page.addInitScript(() => {});

    await page.goto("/?demo=vampire&s=" + Date.now());
    await page.waitForFunction(
      () =>
        (window as any).uiStore !== undefined &&
        (window as any).vault !== undefined,
    );

    // Wait for demo detection and loading
    await page.waitForFunction(
      () =>
        (window as any).sessionModeStore?.isDemoMode &&
        (window as any).vault?.status === "idle" &&
        (window as any).vault.demoVaultName &&
        (window as any).vault.demoVaultName.toLowerCase().includes("vampire"),
      { timeout: 15000 },
    );

    // Demo badge visible
    await expect(page.getByText("DEMO MODE", { exact: true })).toBeVisible();

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
        (window as any).sessionModeStore?.isDemoMode &&
        (window as any).vault?.status === "idle",
      { timeout: 15000 },
    );

    // Add a new entity
    await page.getByTestId("new-entity-button").click();
    const input = page.locator('input[placeholder*="Title..."]');
    await expect(input).toBeVisible();
    await input.fill("New Transient Node");
    await page.getByRole("button", { name: "ADD" }).click();

    await expect(
      page.getByRole("heading", { name: "New Transient Node" }),
    ).toBeVisible();
    await expect(page.getByText(/TRANSIENT MODE/)).toBeVisible();

    // Reload page
    await page.reload();
    await page.waitForFunction(
      () =>
        (window as any).sessionModeStore?.isDemoMode &&
        (window as any).vault?.status === "idle",
      { timeout: 15000 },
    );

    // Node should be gone
    const hasTransientNode = await page.evaluate(() =>
      Object.values((window as any).vault.entities).some(
        (entity: any) => entity.title === "New Transient Node",
      ),
    );
    expect(hasTransientNode).toBe(false);
  });

  test("should convert demo to real campaign", async ({ page }) => {
    await page.goto("/?demo=fantasy&s=" + Date.now());
    await page.waitForFunction(
      () =>
        (window as any).sessionModeStore?.isDemoMode &&
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
    await expect(
      page.getByText("DEMO MODE", { exact: true }),
    ).not.toBeVisible();
  });
});

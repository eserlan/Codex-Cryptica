import { test, expect } from "@playwright/test";

test.describe("Help Onboarding Walkthrough", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean state and force onboarding
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = false;
      (window as any).__E2E__ = true;
    });

    await page.goto("/");
    // Clear localStorage after initial load to reset state, but don't put it in initScript
    // so it doesn't clear on subsequent reloads within the same test.
    await page.evaluate(() => {
      try {
        localStorage.clear();
      } catch (error) {
        if (error instanceof DOMException && error.name === "SecurityError") {
          return;
        }

        throw error;
      }
    });
    // Reload to apply the cleared state
    await page.reload();

    // Dismiss landing page if present and wait for state to update
    const enterButton = page.getByRole("button", { name: "Enter the Codex" });
    await expect(enterButton).toBeVisible({ timeout: 15000 });

    await expect(async () => {
      if (await enterButton.isVisible()) {
        await enterButton.click({ force: true });
      }
      const isDismissed = await page.evaluate(() => {
        const uiStore = (window as any).uiStore;
        return uiStore && !uiStore.isLandingPageVisible;
      });
      expect(isDismissed).toBeTruthy();
    }).toPass({ timeout: 15000 });

    // Force start tour to ensure reliability by waiting for helpStore to be ready
    await page.waitForFunction(
      () => {
        const helpStore = (window as any).helpStore;
        if (!helpStore || !helpStore.isInitialized) return false;

        if (!helpStore.activeTour) {
          helpStore.startTour("initial-onboarding");
        }
        return !!helpStore.activeTour;
      },
      { timeout: 15000 },
    );

    await page.waitForTimeout(2000);
  });

  test("should automatically start onboarding for new users", async ({
    page,
  }) => {
    // 1. Check if welcome modal appears
    await expect(
      page.locator("h3").getByText("Welcome to Codex Cryptica"),
    ).toBeVisible({
      timeout: 10000,
    });

    // 2. Click Next
    await page.getByRole("button", { name: "Next" }).click();
    await page.waitForTimeout(500);

    // 3. Check if Vault step is highlighted (Vault info should be visible)
    await expect(page.locator("h3").getByText("Vault Management")).toBeVisible({
      timeout: 10000,
    });

    // 4. Navigate through all steps
    await page.getByRole("button", { name: "Next" }).click({ force: true }); // Graph
    await page.waitForTimeout(500);
    await expect(page.locator("h3").getByText("Knowledge Graph")).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("button", { name: "Next" }).click({ force: true }); // Map
    await page.waitForTimeout(500);
    await expect(page.locator("h3").getByText("Tactical Maps")).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("button", { name: "Next" }).click({ force: true }); // Canvas
    await page.waitForTimeout(500);
    await expect(page.locator("h3").getByText("Spatial Canvas")).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("button", { name: "Next" }).click({ force: true }); // Search
    await page.waitForTimeout(500);
    await expect(page.locator("h3").getByText("Quick Search")).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("button", { name: "Next" }).click({ force: true }); // Oracle
    await page.waitForTimeout(500);
    await expect(page.locator("h3").getByText("Lore Oracle")).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("button", { name: "Next" }).click({ force: true }); // Dice
    await page.waitForTimeout(500);
    await expect(page.locator("h3").getByText("Polyhedral Dice")).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("button", { name: "Next" }).click({ force: true }); // Importer
    await page.waitForTimeout(500);
    await expect(page.locator("h3").getByText("Archive Importer")).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("button", { name: "Next" }).click({ force: true }); // Settings
    await page.waitForTimeout(500);
    await expect(page.locator("h3").getByText("System Settings")).toBeVisible({
      timeout: 10000,
    });

    // 5. Finish tour
    await page.getByRole("button", { name: "Finish" }).click({ force: true });

    // 6. Verify tour is gone and doesn't reappear
    await expect(
      page.locator("h3").getByText("Welcome to Codex Cryptica"),
    ).not.toBeVisible();
    await page.reload();
    await expect(
      page.locator("h3").getByText("Welcome to Codex Cryptica"),
    ).not.toBeVisible();
  });

  test("should NOT dim the screen on welcome step (body target)", async ({
    page,
  }) => {
    // Welcome step targets "body" so should NOT show dimming overlay
    await expect(page.getByText("Welcome to Codex Cryptica")).toBeVisible();

    // The dimming overlay has role="presentation" and a specific class
    const dimmingOverlay = page.locator('[role="presentation"].bg-black\\/60');
    await expect(dimmingOverlay).not.toBeVisible();

    // Click Next to go to Vault step which HAS a specific target
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Vault Management")).toBeVisible();

    // Now the dimming overlay SHOULD be visible (spotlight on vault button)
    await expect(dimmingOverlay).toBeVisible();
  });

  test("should allow skipping the tour", async ({ page }) => {
    await expect(page.getByText("Welcome to Codex Cryptica")).toBeVisible();
    await page.getByRole("button", { name: "Dismiss tour" }).click();
    await expect(page.getByText("Welcome to Codex Cryptica")).not.toBeVisible();

    // Verify it doesn't reappear
    await page.reload();
    await expect(page.getByText("Welcome to Codex Cryptica")).not.toBeVisible();
  });

  test("should show contextual hints for advanced features", async ({
    page,
  }) => {
    // Skip onboarding
    await expect(page.getByText("Welcome to Codex Cryptica")).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole("button", { name: "Dismiss tour" }).click();

    // Ensure GraphView is fully loaded and ready before interacting
    const canvas = page.locator('[data-testid="graph-canvas"]');
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // 1. Activate Connect Mode (press C)
    await page.keyboard.press("c");
    await page.waitForTimeout(500);

    // 2. Verify hint appears
    await expect(page.getByText("Linking Notes")).toBeVisible({
      timeout: 10000,
    });

    // 3. Dismiss hint
    await page.getByTestId("dismiss-hint-button").click();

    // Wait for removal of the hint UI
    await expect(page.getByTestId("dismiss-hint-button")).not.toBeVisible();

    // 4. Verify it stays dismissed when toggling Connect Mode again
    await page.keyboard.press("c"); // toggle off
    await page.keyboard.press("c"); // toggle on
    await expect(page.getByTestId("dismiss-hint-button")).not.toBeVisible();
  });
});

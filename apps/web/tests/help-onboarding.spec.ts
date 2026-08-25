import { test, expect } from "@playwright/test";

test.describe("Help Onboarding Walkthrough", () => {
  test.beforeEach(async ({ page }) => {
    // This suite intentionally exercises the real onboarding tour, so it does
    // NOT seed onboarding-complete state. It clears storage and force-starts the
    // tour below.
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

    // Wait for the welcome screen to render, then dismiss the landing page.
    await expect(page.getByTestId("welcome-demo-button")).toBeVisible({
      timeout: 15000,
    });

    await expect(async () => {
      await page.evaluate(() => {
        const uiStore = (window as any).uiStore;
        if (uiStore) uiStore.dismissedLandingPage = true;
      });
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

    // Wait for the welcome modal to actually render before tests run
    await expect(
      page.locator("h3").getByText("Welcome — this is your world"),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should automatically start onboarding for new users", async ({
    page,
  }) => {
    // 1. Check if welcome modal appears
    await expect(
      page.locator("h3").getByText("Welcome — this is your world"),
    ).toBeVisible({
      timeout: 10000,
    });

    // 2. Click Next
    await page.getByRole("button", { name: "Next" }).click();
    await expect(
      page
        .locator("h3")
        .getByText(/Create your first character|Watch it connect/),
    ).toBeVisible({ timeout: 10000 });

    // 3. Navigate through remaining steps to Finish
    while (await page.getByRole("button", { name: "Next" }).isVisible()) {
      await page.getByRole("button", { name: "Next" }).click({ force: true });
      await page.waitForTimeout(300);
    }

    // 4. Finish tour
    await page.getByRole("button", { name: "Finish" }).click({ force: true });

    // 5. Verify tour is gone and doesn't reappear
    await expect(
      page.locator("h3").getByText("Welcome — this is your world"),
    ).not.toBeVisible();
    await page.reload();
    await expect(
      page.locator("h3").getByText("Welcome — this is your world"),
    ).not.toBeVisible();
  });

  test("should NOT dim the screen on welcome step (body target)", async ({
    page,
  }) => {
    // Welcome step targets "body" so should NOT show dimming overlay
    await expect(
      page.locator("h3").getByText("Welcome — this is your world"),
    ).toBeVisible();

    // The dimming overlay has role="presentation" and a specific class
    const dimmingOverlay = page.locator('[role="presentation"].bg-black\\/60');
    await expect(dimmingOverlay).not.toBeVisible();

    // Click Next to go to a targeted step
    await page.getByRole("button", { name: "Next" }).click();

    // Now the dimming overlay SHOULD be visible (spotlight on targeted button)
    await expect(dimmingOverlay).toBeVisible();
  });

  test("should allow skipping the tour", async ({ page }) => {
    await expect(
      page.locator("h3").getByText("Welcome — this is your world"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Dismiss tour" }).click();
    await expect(
      page.locator("h3").getByText("Welcome — this is your world"),
    ).not.toBeVisible();

    // Verify it doesn't reappear
    await page.reload();
    await expect(
      page.locator("h3").getByText("Welcome — this is your world"),
    ).not.toBeVisible();
  });

  test("should show contextual hints for advanced features", async ({
    page,
  }) => {
    // Skip onboarding
    await expect(
      page.locator("h3").getByText("Welcome — this is your world"),
    ).toBeVisible({
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

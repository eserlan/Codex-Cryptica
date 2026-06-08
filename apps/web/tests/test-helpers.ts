import { expect, type Page } from "@playwright/test";

/**
 * Seed real onboarding-complete state so tours/demo/landing don't auto-trigger.
 * Replaces the former `window.DISABLE_ONBOARDING` / `window.__E2E__` test globals
 * by writing the same persisted keys the app reads on boot:
 *  - codex_skip_landing -> onboarding store skips the landing page (so it boots)
 *  - codex-cryptica-help-state -> help store marks the onboarding tour as seen,
 *    which suppresses the auto tour/demo trigger
 * Pass to `page.addInitScript` so it runs before the app boots on every navigation.
 */
export function seedOnboardingComplete() {
  try {
    localStorage.setItem("codex_skip_landing", "true");
    localStorage.setItem(
      "codex-cryptica-help-state",
      JSON.stringify({ completedTours: ["initial-onboarding"] }),
    );
  } catch {
    /* ignore */
  }
}

/** Shared setup for vault E2E tests */
export async function setupVaultPage(page: Page) {
  await page.addInitScript(seedOnboardingComplete);

  await page.goto("/");
  // Wait for vault initialization (OPFS auto-load)
  await page.waitForFunction(
    () => {
      const status = (window as any).vault?.status;
      return status === "idle";
    },
    {
      timeout: 15000,
    },
  );
  await page.evaluate(() => {
    const ui = (window as any).uiStore;
    if (ui) {
      ui.dismissedWorldPage = true;
      ui.dismissedLandingPage = true;
      ui.skipWelcomeScreen = true;
    }
  });
  await expect(page.getByTestId("graph-canvas")).toBeVisible({
    timeout: 10000,
  });
}

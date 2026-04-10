import { expect, type Page } from "@playwright/test";

/** Shared setup for vault E2E tests */
export async function setupVaultPage(page: Page) {
  await page.addInitScript(() => {
    (window as any).DISABLE_ONBOARDING = true;
    (window as any).__E2E__ = true;
    try {
      localStorage.setItem("codex_skip_landing", "true");
    } catch {
      /* ignore */
    }
  });

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
  await expect(page.getByTestId("graph-canvas")).toBeVisible({
    timeout: 10000,
  });
}

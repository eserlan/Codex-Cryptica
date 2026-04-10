import { test, expect } from "@playwright/test";

test.describe("Vault Initialization", () => {
  test.beforeEach(async ({ page }) => {
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
        console.log(
          `[E2E Wait] Current vault status: ${status}, isInitialized: ${(window as any).vault?.isInitialized}`,
        );
        return status === "idle";
      },
      {
        timeout: 15000,
      },
    );
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 10000,
    });
  });

  test("auto-initializes default vault", async ({ page }) => {
    await expect(page.getByTitle("Switch Vault")).toContainText(
      /Default Vault|Local Vault/,
    );
    // Should be empty initially — when 0 entities, the UI shows "NO ARCHIVE" instead of entity-count
    await expect(page.getByText("NO ARCHIVE")).toBeVisible();
  });
});

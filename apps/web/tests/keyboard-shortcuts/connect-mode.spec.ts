import { test, expect } from "@playwright/test";

test.describe("Connect Mode", () => {
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

  test("toggles connect mode via keyboard", async ({ page }) => {
    // Need at least one node to connect
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Chronicle Title...").fill("Source Node");
    await page.getByRole("button", { name: "ADD" }).click();

    // 1. Toggle via Keyboard 'C'
    await page.keyboard.press("c");
    await expect(page.getByText("Select Source Entity")).toBeVisible();

    // Toggle off via Keyboard 'C'
    await page.keyboard.press("c");
    await expect(page.getByText("Select Source Entity")).not.toBeVisible();
  });
});

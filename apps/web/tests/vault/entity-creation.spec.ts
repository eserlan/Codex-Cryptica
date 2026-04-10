import { test, expect } from "@playwright/test";

test.describe("Entity Creation", () => {
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

  test("creates entities and updates graph", async ({ page }) => {
    // Create Node A
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Chronicle Title...").fill("Node A");
    await page.getByRole("button", { name: "ADD" }).click();
    await expect(page.getByTestId("entity-count")).toHaveText("1 CHRONICLE");

    // Create Node B
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Chronicle Title...").fill("Node B");
    await page.getByRole("button", { name: "ADD" }).click();
    await expect(page.getByTestId("entity-count")).toHaveText("2 CHRONICLES");

    // Verify Search
    await page.keyboard.press("Control+k");
    await page.getByPlaceholder("Search (Cmd+K)...").fill("Node A");
    await expect(page.getByTestId("search-result").first()).toContainText(
      "Node A",
    );
    await page.keyboard.press("Escape");
  });
});

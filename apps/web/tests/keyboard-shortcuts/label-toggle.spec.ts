import { test, expect } from "@playwright/test";

test.describe("Label Toggle", () => {
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

  test("toggles node labels via shortcut", async ({ page }) => {
    // 1. Initial State: Labels should be shown by default
    const isShownInitially = await page.evaluate(
      () => (window as any).graph.showLabels,
    );
    expect(isShownInitially).toBe(true);

    // 2. Toggle Off
    await page.evaluate(() => (window as any).graph.toggleLabels());
    const isHiddenAfterPress = await page.evaluate(
      () => (window as any).graph.showLabels,
    );
    expect(isHiddenAfterPress).toBe(false);

    // Verify Cytoscape style reflects this
    // Create a node first to be sure we can check style.
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Chronicle Title...").fill("Test Node");
    await page.getByRole("button", { name: "ADD" }).click();

    const labelStyleAfterHide = await page.evaluate(() => {
      const cy = (window as any).cy;
      return cy.nodes()[0]?.style("label");
    });
    expect(labelStyleAfterHide).toBe("");

    // 3. Toggle back On
    await page.evaluate(() => (window as any).graph.toggleLabels());
    const isShownAgain = await page.evaluate(
      () => (window as any).graph.showLabels,
    );
    expect(isShownAgain).toBe(true);

    const labelStyleAfterShow = await page.evaluate(() => {
      const cy = (window as any).cy;
      return cy.nodes()[0]?.style("label");
    });
    expect(labelStyleAfterShow).not.toBe("");
  });
});

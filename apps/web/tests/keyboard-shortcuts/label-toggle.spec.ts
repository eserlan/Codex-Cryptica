import { test, expect } from "@playwright/test";
import { setupVaultPage } from "../test-helpers";

test.describe("Label Toggle", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  test("toggles node labels via shortcut", async ({ page }) => {
    // Create a node first so we can check label style
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Chronicle Title...").fill("Test Node");
    await page.getByRole("button", { name: "ADD" }).click();

    // Blur any focused input to ensure shortcut handler runs
    await page.locator("#graph-canvas, canvas").first().click();

    // 1. Initial State: Labels should be shown by default
    const isShownInitially = await page.evaluate(
      () => (window as any).graph.showLabels,
    );
    expect(isShownInitially).toBe(true);

    const labelStyleInitial = await page.evaluate(() => {
      const cy = (window as any).cy;
      return cy.nodes()[0]?.style("label");
    });
    expect(labelStyleInitial).not.toBe("");

    // 2. Toggle Off via keyboard shortcut
    await page.keyboard.press("l");
    const isHiddenAfterPress = await page.evaluate(
      () => (window as any).graph.showLabels,
    );
    expect(isHiddenAfterPress).toBe(false);

    const labelStyleAfterHide = await page.evaluate(() => {
      const cy = (window as any).cy;
      return cy.nodes()[0]?.style("label");
    });
    expect(labelStyleAfterHide).toBe("");

    // 3. Toggle back On via keyboard shortcut
    await page.keyboard.press("l");
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

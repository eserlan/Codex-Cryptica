import { test, expect } from "@playwright/test";
import { setupVaultPage } from "../test-helpers";

test.describe("Connect Mode", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  test("toggles connect mode via keyboard", async ({ page }) => {
    // Need at least one node to connect
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Chronicle Title...").fill("Source Node");
    await page.getByRole("button", { name: "ADD" }).click();

    // Blur any focused input to ensure shortcut handler runs
    await page.locator("#graph-canvas, canvas").first().click();

    // 1. Toggle via Keyboard 'C'
    await page.keyboard.press("c");
    await expect(page.getByText("Select Source Entity")).toBeVisible();

    // Toggle off via Keyboard 'C'
    await page.keyboard.press("c");
    await expect(page.getByText("Select Source Entity")).not.toBeVisible();
  });
});

import { test, expect } from "@playwright/test";

test.describe("Graph Keyboard Interactions", () => {
  test("should toggle connect mode with 'C' key", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );
    });

    await page.goto("/");
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 10000,
    });

    // Press 'C' to enter connect mode
    await page.keyboard.press("c");

    // Check if HUD shows Connect Mode instructions
    await expect(page.getByText("Select Source Entity")).toBeVisible();

    // Check if Toolbar button reflects active state (aria-pressed)
    // Label changes when active
    const connectButton = page.getByLabel("Exit Connect Mode");
    await expect(connectButton).toHaveAttribute("aria-pressed", "true");

    // Press 'C' again to exit
    await page.keyboard.press("c");
    await expect(page.getByText("Select Source Entity")).not.toBeVisible();
    await expect(page.getByLabel("Enter Connect Mode (C)")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("should exit connect mode with 'Escape' key", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );
    });

    await page.goto("/");
    await expect(page.getByTestId("graph-canvas")).toBeVisible();

    await page.keyboard.press("c");
    await expect(page.getByText("Select Source Entity")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByText("Select Source Entity")).not.toBeVisible();
  });
});

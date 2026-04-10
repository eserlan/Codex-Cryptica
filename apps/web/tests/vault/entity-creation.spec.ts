import { test, expect } from "@playwright/test";
import { setupVaultPage } from "../test-helpers";

test.describe("Entity Creation", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
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

    // Verify Search (OS-agnostic shortcut)
    const searchShortcutModifier =
      process.platform === "darwin" ? "Meta" : "Control";
    await page.keyboard.press(`${searchShortcutModifier}+k`);
    await page.getByPlaceholder("Search (Cmd+K)...").fill("Node A");
    await expect(page.getByTestId("search-result").first()).toContainText(
      "Node A",
    );
    await page.keyboard.press("Escape");
  });
});

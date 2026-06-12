import { test, expect } from "@playwright/test";
import { setupVaultPage } from "../test-helpers";

test.describe("Entity Creation", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  test("creates entities and updates graph", async ({ page }) => {
    // Helper to create an entity via the vault API (avoids UI jargon issues)
    const createEntity = async (name: string) => {
      await page.evaluate(async (entityName) => {
        await (window as any).vault.createEntity("character", entityName);
      }, name);
    };

    await createEntity("Node A");
    await expect(page.getByTestId("entity-count")).toContainText(
      /1\s*(CHRONICLE|NOTE)/,
      { timeout: 10000 },
    );

    await createEntity("Node B");
    await expect(page.getByTestId("entity-count")).toContainText(
      /2\s*(CHRONICLES|NOTES)/,
      { timeout: 10000 },
    );

    // Wait for search index to pick up both entities via setQuery + results
    await page.waitForFunction(
      async () => {
        const s = (window as any).searchStore;
        if (!s?.setQuery) return false;
        await s.setQuery("Node A");
        return Array.isArray(s.results) && s.results.length > 0;
      },
      { timeout: 15000 },
    );

    // Verify Search (OS-agnostic shortcut)
    const searchShortcutModifier =
      process.platform === "darwin" ? "Meta" : "Control";
    await page.keyboard.press(`${searchShortcutModifier}+k`);
    const searchInput = page.getByPlaceholder("Search notes...");
    await searchInput.waitFor({ state: "visible", timeout: 5000 });
    await searchInput.fill("Node A");
    await expect(page.locator("#search-result-0")).toContainText("Node A", {
      timeout: 5000,
    });
    await page.keyboard.press("Escape");
  });
});

import { test, expect } from "@playwright/test";

test.describe("Rich Text Editor", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );
    });
  });

  test("Editor loads and updates content", async ({ page }) => {
    await page.goto("/test/markdown-editor");

    // Check if editor container is present
    const editorContainer = page.getByTestId("editor-container");
    await expect(editorContainer).toBeVisible({ timeout: 10000 });

    // Check for toolbar buttons
    await expect(page.locator('button[title="Bold (Cmd+B)"]')).toBeVisible({
      timeout: 10000,
    });

    // Interact with editor (ProseMirror contenteditable div)
    const editor = page.locator(".ProseMirror");
    await expect(editor).toBeVisible({ timeout: 10000 });
    await editor.click();
    await editor.type("Hello World");

    // Check output update
    const output = page.getByTestId("markdown-output");
    await expect(output).toContainText("Hello World", { timeout: 10000 });
  });

  test("Zen Mode toggles correctly", async ({ page }) => {
    await page.goto("/test/markdown-editor");

    const zenButton = page.locator('button[title="Zen Mode (Cmd+Shift+F)"]');
    await expect(zenButton).toBeVisible({ timeout: 10000 });

    // Click to enter Zen Mode
    await zenButton.click();

    // Check if the container has the 'zen-mode' class
    await expect(page.locator(".zen-mode")).toBeVisible({ timeout: 5000 });

    // Click to exit Zen Mode
    const exitButton = page.locator('button[title="Exit Zen Mode (Esc)"]');
    await expect(exitButton).toBeVisible({ timeout: 5000 });
    await exitButton.click();

    await expect(page.locator(".zen-mode")).not.toBeVisible({ timeout: 5000 });
  });
});

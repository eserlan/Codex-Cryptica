import { test, expect } from "@playwright/test";

test.describe("Rich Text Editor", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
    });
  });

  test("Editor loads and updates content", async ({ page }) => {
    await page.goto("/test/markdown-editor");

    // Check if editor container is present
    const editorContainer = page.getByTestId("editor-container");
    await expect(editorContainer).toBeVisible();

    // Check for toolbar buttons
    await expect(page.locator('button[title="Bold (Cmd+B)"]')).toBeVisible();

    // Interact with editor (ProseMirror contenteditable div)
    const editor = page.locator(".ProseMirror");
    await expect(editor).toBeVisible();
    await editor.click();
    await editor.type("Hello World");

    // Check output update
    const output = page.getByTestId("markdown-output");
    await expect(output).toContainText("Hello World");
  });

  test("Zen Mode toggles correctly", async ({ page }) => {
    await page.goto("/test/markdown-editor");

    const zenButton = page.locator('button[title="Zen Mode (Cmd+Shift+F)"]');
    await expect(zenButton).toBeVisible();

    // Click to enter Zen Mode
    await zenButton.click();

    // Check if the container has the 'zen-mode' class
    // We need to find the container that gets the class.
    // In MarkdownEditor.svelte: <div class="markdown-editor-container ... class:zen-mode={isZenMode}">
    // The test page wraps MarkdownEditor in a div with data-testid="editor-container", but the class is on the inner div.
    // We can look for the class .zen-mode
    await expect(page.locator(".zen-mode")).toBeVisible({ timeout: 1000 });

    // Click to exit Zen Mode
    const exitButton = page.locator('button[title="Exit Zen Mode (Esc)"]');
    await expect(exitButton).toBeVisible();
    await exitButton.click();

    await expect(page.locator(".zen-mode")).not.toBeVisible();
  });
});

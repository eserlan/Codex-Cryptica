import { expect, test } from "@playwright/test";

test.describe("MarkdownEditor", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => (window as any).DISABLE_ONBOARDING = true);
  });

  test("initializes with content and updates output", async ({ page }) => {
    await page.goto("/test/markdown-editor");

    // Check if editor exists
    const editor = page.locator(".ProseMirror");
    await expect(editor).toBeVisible();

    // Check initial content rendering (Tiptap renders header as h1)
    await expect(editor.locator("h1")).toHaveText("Initial Content");

    // Type new content
    await editor.clear();
    // Clearing might leave an empty p, let's type directly
    // Better: Press Control+A, Delete
    await editor.press("Control+A");
    await editor.press("Backspace");

    await editor.fill("Hello **World**");

    // Wait for potential debounce if any (none implemented but good practice to wait for output)
    const output = page.getByTestId("markdown-output");

    // Check markdown output
    // Tiptap's markdown extension should convert bold to **World** or __World__
    // "Hello **World**" typed into rich text editor:
    // "Hello " is text. "**World**" typed literally?
    // Wait, Tiptap is a WYSIWYG editor. If I `fill` "Hello **World**", it inserts that as text.
    // It won't automatically become bold unless I use markdown shortcuts if they are enabled in Tiptap,
    // OR if I type it and the markdown extension parses it?
    // Actually, Tiptap `fill` behaves like pasting text.
    // If I want to create bold text, I should type "Hello " then select "World" and bold it?
    // OR, if `tiptap-markdown` supports markdown shortcuts.

    // Let's try typing with shortcuts.
    await editor.press("Control+A");
    await editor.press("Backspace");
    await editor.type("Hello ");
    await editor.type("**World**"); // Markdown shortcut for bold

    // Verify output in preview
    await expect(output).toContainText("Hello **World**");
  });

  test("inserts embed widget via exposed method", async ({ page }) => {
    await page.goto("/test/markdown-editor");

    // Click the insert button
    await page.getByTestId("insert-embed-btn").click();

    // Check if embed-widget is rendered in the editor
    // We look for the tag or class defined in EmbedWidget.svelte/EmbedExtension
    const embed = page.locator(".embed-widget");
    await expect(embed).toBeVisible();
    await expect(embed).toContainText("Embedded Content");
    await expect(embed).toContainText("https://example.com/demo-content");
  });
});

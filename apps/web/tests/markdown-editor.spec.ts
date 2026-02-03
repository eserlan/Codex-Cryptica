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

  test("renders and serializes bullet lists correctly", async ({ page }) => {
    await page.goto("/test/markdown-editor");

    const editor = page.locator(".ProseMirror");
    await expect(editor).toBeVisible();

    // Clear editor
    await editor.press("Control+A");
    await editor.press("Backspace");

    // Type a bullet list using markdown shortcuts
    await editor.type("* Item 1");
    await editor.press("Enter");
    await editor.type("Item 2");
    await editor.press("Enter");
    await editor.press("Backspace"); // Exit list

    // Verify it rendered as a list in DOM
    await expect(editor.locator("ul")).toBeVisible();
    await expect(editor.locator("li")).toHaveCount(2);
    await expect(editor.locator("li").first()).toHaveText("Item 1");

    // Verify toolbar button is active
    const bulletBtn = page.getByTitle("Bullet List");
    await expect(bulletBtn).toHaveClass(/active/);

    // Verify markdown output
    const output = page.getByTestId("markdown-output");
    await expect(output).toContainText("- Item 1");
    await expect(output).toContainText("- Item 2");
  });

  test("renders and serializes ordered lists correctly", async ({ page }) => {
    await page.goto("/test/markdown-editor");

    const editor = page.locator(".ProseMirror");
    await expect(editor).toBeVisible();

    // Clear editor
    await editor.press("Control+A");
    await editor.press("Backspace");

    // Type an ordered list
    await editor.type("1. First");
    await editor.press("Enter");
    await editor.type("Second");

    // Verify DOM
    await expect(editor.locator("ol")).toBeVisible();
    await expect(editor.locator("li")).toHaveCount(2);
    await expect(editor.locator("li").first()).toHaveText("First");

    // Verify markdown
    const output = page.getByTestId("markdown-output");
    await expect(output).toContainText("1. First");
    await expect(output).toContainText("2. Second");
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

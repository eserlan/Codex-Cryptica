import { expect, test } from "@playwright/test";

test.describe("MarkdownEditor", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => (window as any).DISABLE_ONBOARDING = true);
    await page.goto("/test/markdown-editor");
  });

  test("initializes with content and updates output", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await expect(editor).toBeVisible();

    // Check initial content rendering (Tiptap renders header as h1)
    await expect(editor.locator("h1")).toHaveText("Initial Content");

    // Type new content
    await editor.press("Control+A");
    await editor.press("Backspace");

    await editor.type("Hello ");
    await editor.type("**World**"); // Markdown shortcut for bold

    // Verify output in preview
    const output = page.getByTestId("markdown-output");
    await expect(output).toContainText("Hello **World**");
  });

  test("renders and serializes bullet lists correctly", async ({ page }) => {
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
    // Click the insert button
    await page.getByTestId("insert-embed-btn").click();

    // Check if embed-widget is rendered in the editor
    const embed = page.locator(".embed-widget");
    await expect(embed).toBeVisible();
    await expect(embed).toContainText("Embedded Content");
    await expect(embed).toContainText("https://example.com/demo-content");
  });
});
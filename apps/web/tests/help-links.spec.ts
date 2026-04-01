import { test, expect } from "@playwright/test";

test.describe("Direct Help Links", () => {
  test.beforeEach(async ({ context, page }) => {
    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-write", "clipboard-read"]);

    // Disable onboarding to access main UI
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      localStorage.setItem("codex_skip_landing", "true");
    });
  });

  test("should open help center to specific article when hash is present", async ({
    page,
  }) => {
    // 1. Navigate to the app with a help hash
    await page.goto("/#help/graph-basics");

    // 2. Verify the help article opened through the store state
    await page.waitForFunction(
      () =>
        (window as any).uiStore?.showSettings === true &&
        (window as any).helpStore?.expandedId === "graph-basics",
      { timeout: 15000 },
    );

    // 3. Verify the specific article is expanded
    await expect(
      page.locator(".prose h2", { hasText: /Quick Guide/i }).first(),
    ).toBeVisible();
  });

  test("should update help article when hash changes", async ({ page }) => {
    // 1. Navigate to the help hash directly
    await page.goto("/#help/oracle-guide");

    // 2. Verify the help store opened the requested article
    await page.waitForFunction(
      () =>
        (window as any).uiStore?.showSettings === true &&
        (window as any).helpStore?.expandedId === "oracle-guide",
      { timeout: 15000 },
    );
  });

  test("should handle invalid help article ID gracefully", async ({ page }) => {
    // 1. Navigate to the app with an invalid help hash
    await page.goto("/#help/invalid-article-id");

    // 2. Settings modal should NOT be open
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test("should handle malformed help hash gracefully", async ({ page }) => {
    // 1. Navigate to the app with a malformed hash
    await page.goto("/#help/");

    // 2. Settings modal should NOT be open
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test("should copy direct link to clipboard when link button is clicked", async ({
    page,
  }) => {
    // 1. Open Help
    await page.goto("/");
    await page.click('button[title="Application Settings"]');
    await page.click('[role="tab"]:has-text("Help")');

    // 2. Click the copy link button for "Knowledge Graph"
    // Using real button selector after refactoring
    await page.click(
      'button[aria-label="Copy direct link to Knowledge Graph"]',
    );

    // 3. Verify clipboard content using poll for robustness
    await expect
      .poll(async () => {
        return await page.evaluate(async () => {
          return await navigator.clipboard.readText();
        });
      })
      .toContain("#help/graph-basics");
  });
});

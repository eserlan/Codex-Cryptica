import { test, expect } from "@playwright/test";

test.describe("Direct Help Links", () => {
  test.beforeEach(async ({ context, page }) => {
    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-write", "clipboard-read"]);

    // Disable onboarding to access main UI
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
    });
  });

  test("should open help center to specific article when hash is present", async ({
    page,
  }) => {
    // 1. Navigate to the app with a help hash
    await page.goto("/#help/graph-basics");

    // 2. Verify settings modal is open
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // 3. Verify Help tab is active
    await expect(page.locator("h2", { hasText: "Help" })).toBeVisible();

    // 4. Verify the specific article is expanded
    // When expanded, it should show the content
    await expect(
      page.locator(".prose h2", { hasText: "Mastering the Graph" }),
    ).toBeVisible();
  });

  test("should update help article when hash changes", async ({ page }) => {
    // 1. Navigate to app
    await page.goto("/");

    // 2. Change hash to help link
    await page.evaluate(() => {
      window.location.hash = "#help/oracle-guide";
    });

    // Small delay for $effect to trigger
    await page.waitForTimeout(500);

    // 3. Verify settings modal is open (help link should trigger it)
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    // 4. Verify Help center opens
    await expect(page.locator("h2", { hasText: "Help" })).toBeVisible();

    // 5. Verify specific article (The Lore Oracle) is expanded
    // Note: title of oracle-guide.md is "The Lore Oracle"
    await expect(page.getByText("THE LORE ORACLE")).toBeVisible();
  });
  test("should copy direct link to clipboard when link button is clicked", async ({
    page,
  }) => {
    // 1. Open Help
    await page.goto("/");
    await page.click('button[title="Application Settings"]');
    await page.click('[role="tab"]:has-text("Help")');

    // 2. Click the copy link button for "Knowledge Graph"
    await page.click(
      '[role="button"][aria-label="Copy direct link to Knowledge Graph"]',
    );

    // 3. Verify clipboard content
    await page.waitForTimeout(1000);
    const result = await page.evaluate(async () => {
      return await navigator.clipboard.readText();
    });
    expect(result).toContain("#help/graph-basics");
  });
});

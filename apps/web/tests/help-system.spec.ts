import { test, expect } from "@playwright/test";

test.describe("Help Center System", () => {
  test.beforeEach(async ({ page }) => {
    // Disable onboarding to access main UI
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
    });
    await page.goto("/");
  });

  test("should open help center and display articles list", async ({
    page,
  }) => {
    // 1. Open Settings
    await page.click('button[title="Application Settings"]');

    // 2. Click Help tab
    await page.click('[role="tab"]:has-text("Help")');

    // 3. Verify Help Center header
    await expect(page.locator("h2", { hasText: "Help" })).toBeVisible();

    // 4. Verify list of articles from markdown files
    // Check for specific titles we know exist from migration
    await expect(page.getByText("Getting Started")).toBeVisible();
    await expect(page.getByText("Connections Proposer")).toBeVisible();
    await expect(page.getByText("Knowledge Graph")).toBeVisible();
    await expect(page.getByText("The Lore Oracle")).toBeVisible();
  });

  test("should allow searching for help articles", async ({ page }) => {
    // 1. Open Help
    await page.click('button[title="Application Settings"]');
    await page.click('[role="tab"]:has-text("Help")');

    // 2. Type in search box
    const searchInput = page.getByPlaceholder("Search documentation...");
    await searchInput.fill("Gemini");

    // 3. Verify filtering works
    // Should show "The Lore Oracle" and "Acquiring a Gemini API Key"
    await expect(page.getByText("Acquiring a Gemini API Key")).toBeVisible();
    await expect(page.getByText("The Lore Oracle")).toBeVisible();

    await searchInput.fill("Sovereignty");
    await expect(page.getByText("Getting Started")).toBeVisible();
    await expect(page.getByText("Connections Proposer")).not.toBeVisible();
  });

  test("should display article content when clicked", async ({ page }) => {
    // 1. Open Help
    await page.click('button[title="Application Settings"]');
    await page.click('[role="tab"]:has-text("Help")');

    // 2. Click "Getting Started"
    await page.click('text="Getting Started"');

    // 3. Verify content renders (Markdown to HTML)
    // Check for h2 header in content
    await expect(
      page.locator('.prose h2:has-text("Welcome to the Archive")'),
    ).toBeVisible();

    // Check for bold text
    await expect(
      page.locator('strong:has-text("absolute sovereignty")'),
    ).toBeVisible();
  });
});

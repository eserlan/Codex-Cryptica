import { test, expect } from "@playwright/test";

/**
 * The Features page (chunk 11).
 *
 * It used to render `Object.values(FEATURE_HINTS)`: 68 equally weighted cards
 * in config order, including internals like SEO prerendering. These pin the
 * shape that replaced it, since the failure mode is silent, a page that slowly
 * becomes a wall again as hints are added.
 */

test.describe("Features page", () => {
  test("presents jobs, not a flat card wall", async ({ page }) => {
    await page.goto("/features");

    const groups = page.getByTestId("feature-group");
    await expect(groups).toHaveCount(5);

    // Each group leads with a few and lists the rest, so no group is a wall.
    const leads = await page.getByTestId("feature-lead").count();
    const rest = await page.locator('[data-testid="feature-rest"] li').count();
    expect(leads).toBe(20);
    expect(rest).toBeGreaterThan(0);
  });

  test("orders the reader's jobs before the AI ones", async ({ page }) => {
    await page.goto("/features");

    const headings = await page
      .getByTestId("feature-group")
      .locator("h2")
      .allTextContents();

    expect(headings).toEqual([
      "Build the world",
      "See how it connects",
      "Run the session",
      "Get unstuck",
      "Your data stays yours",
    ]);
  });

  test("keeps implementation details off the page", async ({ page }) => {
    await page.goto("/features");
    // Named in the assessment as the clearest case of a changelog entry
    // presented as a product feature.
    await expect(page.getByText("SEO Prerendering")).toHaveCount(0);
    await expect(page.getByText("Adjustable Sidebars")).toHaveCount(0);
  });
});

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
    await expect(page.getByTestId("feature-lead")).toHaveCount(20);
    await expect
      .poll(() => page.locator('[data-testid="feature-rest"] li').count())
      .toBeGreaterThan(0);
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

test("every group leads with a real product screenshot", async ({ page }) => {
  await page.goto("/features");

  // Chunk 14 asks for real interface captures rather than decorative art, and
  // chunk 11 asks each group to lead with one. They are lazy-loaded, so scroll
  // the page before asking whether they decoded.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 200));
    }
  });

  const images = page.locator(
    "section[data-testid='feature-group'] header img",
  );
  await expect(images).toHaveCount(5);

  const loaded = await images.evaluateAll((els) =>
    els.map((el) => ({
      decoded: (el as HTMLImageElement).naturalWidth > 0,
      described: ((el as HTMLImageElement).alt || "").length > 20,
    })),
  );
  expect(loaded.every((i) => i.decoded)).toBe(true);
  // Alt text has to say what the capture shows, not "screenshot".
  expect(loaded.every((i) => i.described)).toBe(true);
});

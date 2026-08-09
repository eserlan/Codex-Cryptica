import { test, expect } from "@playwright/test";

/**
 * The hand-written `/tools/*` generator pages (chunk 12 phase 1).
 *
 * They now render the same `GeneratorPageContent` the `/generators/[slug]`
 * route uses, passing only their own copy, FAQs and canonical. These tests pin
 * the two things that refactor could break silently: that each page still
 * claims its own URL rather than inheriting the slug's, and that the generator
 * on it still works.
 */

const LIVE_PAGES = [
  { path: "/tools/rpg-npc-generator", title: /RPG NPC Generator/ },
  { path: "/tools/fantasy-name-generator", title: /Fantasy Name Generator/ },
  { path: "/tools/quest-hook-generator", title: /Quest Hook Generator/ },
  { path: "/tools/vampire-clan-generator", title: /Vampire Clan Generator/ },
  {
    path: "/tools/cyberpunk-nomad-clan-generator",
    title: /Cyberpunk Nomad Clan Generator/,
  },
];

test.describe("Tools generator pages", () => {
  for (const { path, title } of LIVE_PAGES) {
    test(`${path} keeps its own canonical and copy`, async ({ page }) => {
      await page.goto(path);

      // The whole point of metaOverrides: sharing the slug's wiring must not
      // hand the slug's identity to a route with its own URL and pitch.
      await expect(page).toHaveTitle(title);
      const canonical = await page
        .locator('link[rel="canonical"]')
        .getAttribute("href");
      expect(canonical).toBe(`https://codexcryptica.com${path}`);

      await expect(page.locator("#generate-button")).toBeVisible();
    });
  }

  test("the two consolidated routes still redirect", async ({ page }) => {
    // These were redirected to the canonical slug pages before this refactor;
    // their page components were dead code and have been removed.
    await page.goto("/tools/dnd-npc-generator");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://codexcryptica.com/generators/npc",
    );

    await page.goto("/tools/faction-generator");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://codexcryptica.com/generators/faction",
    );
  });

  test("a tools page can still generate", async ({ page }) => {
    await page.goto("/tools/vampire-clan-generator");
    await page.locator("#generate-button").click();

    // Local generation, no AI and no account.
    await expect(page.locator("#copy-markdown-btn")).toBeVisible({
      timeout: 20000,
    });
  });
});

test.describe("Tools pages show an example draft on load", () => {
  /**
   * The regression this guards against, found in review of the refactor that
   * introduced this file: moving these routes onto the shared component
   * silently dropped each page's own `initialDraft`. For a slug with no shared
   * draft that is worse than a content change, because SEOGeneratorLayout
   * falls back to auto-generating on mount, which replaces the above-the-fold
   * example and disables Generate while it runs.
   *
   * Either source is fine, the page's own override or the shared slug draft.
   * What must not happen is a page arriving with nothing.
   */
  const EXPECTED_TITLES: Record<string, string> = {
    "/tools/fantasy-name-generator": "Generic Fantasy Names",
    "/tools/quest-hook-generator": "The Sunken Relic",
    "/tools/vampire-clan-generator": "House of Thorn",
    "/tools/cyberpunk-nomad-clan-generator": "Dustborn Convoy",
  };

  for (const [path, title] of Object.entries(EXPECTED_TITLES)) {
    test(`${path} lands on its example, not a spinner`, async ({ page }) => {
      await page.goto(path);

      // The draft is present without the visitor asking for one.
      await expect(page.locator("#copy-markdown-btn")).toBeVisible({
        timeout: 15000,
      });
      await expect(page.getByText(title).first()).toBeVisible();

      // And it arrived as a fixture rather than an on-mount generation, so the
      // primary action is usable immediately.
      await expect(page.locator("#generate-button")).toBeEnabled();
    });
  }
});

import { test, expect, type Page } from "@playwright/test";

/**
 * The public shell (chunk 9 phase 2).
 *
 * Before it existed, `(marketing)/+layout.svelte` rendered nothing shared and
 * 10 of 30 public pages had no chrome at all. These tests pin the two things
 * that regress silently: that every public page has exactly one of each
 * landmark, and that the nav is reachable on a phone, which it never was.
 */

const SHELL_PAGES = [
  "/generators",
  "/blog",
  "/tools",
  "/features",
  "/tools/dnd-npc-generator",
];

const landmarkCounts = (page: Page) =>
  page.evaluate(() => ({
    footers: document.querySelectorAll("footer").length,
    mains: document.querySelectorAll("main").length,
    wordmarks: document.querySelectorAll('[data-testid="shell-wordmark"]')
      .length,
  }));

test.describe("Public shell", () => {
  for (const path of SHELL_PAGES) {
    test(`${path} renders the shell exactly once`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByTestId("shell-wordmark")).toBeVisible();

      // The banner is asserted by role rather than by counting <header> tags:
      // several pages open their content with a page-level <header>, which is
      // legitimate and carries no landmark role because it sits inside <main>.
      // Only the shell's own header, a sibling of <main>, is the banner — so
      // this is what catches a layout reintroducing a second one.
      await expect(page.getByRole("banner")).toHaveCount(1);

      // One landmark each: the old per-page footers and the SEO layouts'
      // duplicate headers are gone, and no page nests its own <main>.
      expect(await landmarkCounts(page)).toEqual({
        footers: 1,
        mains: 1,
        wordmarks: 1,
      });
    });
  }

  test("the nav is reachable on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/generators");

    // Both previous headers were `hidden md:flex`, so mobile had no navigation
    // at all, on 55% of real visits.
    const toggle = page.getByTestId("shell-menu-toggle");
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    // The button is server-rendered, so it is clickable before hydration and a
    // click that lands early is simply dropped.
    await page.waitForLoadState("networkidle");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    const mobileNav = page.getByTestId("shell-mobile-nav");
    await expect(mobileNav).toBeVisible();
    await expect(
      mobileNav.getByRole("link", { name: "Features" }),
    ).toBeVisible();
  });

  test("the header CTA keeps its campaign attribution", async ({ page }) => {
    await page.goto("/tools/dnd-npc-generator");
    const href = await page.getByTestId("shell-cta").getAttribute("href");
    // Pinned because attribution reporting is built on these values.
    expect(href).toContain("utm_source=generator-header-cta");
    expect(href).toContain("utm_campaign=seo-funnel");
  });
});

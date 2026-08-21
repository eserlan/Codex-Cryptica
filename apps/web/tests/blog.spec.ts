import { test, expect } from "@playwright/test";

test.describe("Blog", () => {
  test("should load the blog index page", async ({ page }) => {
    await page.goto("/blog");

    // Check title
    await expect(page).toHaveTitle(/The Archive | Codex Cryptica Blog/);

    // Check heading
    const heading = page.getByRole("heading", {
      name: "The Archive",
      exact: true,
    });
    await expect(heading).toBeVisible();

    // Check if the first article is listed
    const articleLink = page.getByText(/The GM['']s Guide to Data Sovereignty/);
    await expect(articleLink).toBeVisible();
  });

  test("should navigate to and render the first article", async ({ page }) => {
    await page.goto("/blog");

    const articleLink = page.getByRole("link", {
      name: "The GM's Guide to Data Sovereignty: Your World, Your Files",
    });
    await articleLink.click();

    // Wait for navigation
    await expect(page).toHaveURL(/\/blog\/gm-guide-data-sovereignty/);

    // Check title and metadata
    await expect(page).toHaveTitle(/The GM's Guide to Data Sovereignty/);

    // Check article content
    const articleContent = page.locator(".blog-content");
    await expect(articleContent).toBeVisible();
    await expect(articleContent).toContainText("What is Local-First");
    await expect(articleContent).toContainText("The Power of Synchronization");

    // Check CTA button
    const ctaButton = page.getByRole("link", {
      name: /Enter the Codex/,
      exact: false,
    });
    await expect(ctaButton).toBeVisible();
  });

  test("should navigate to and render the spatial intelligence article", async ({
    page,
  }) => {
    await page.goto("/blog");

    const articleLink = page.getByRole("link", {
      name: "Spatial Intelligence: How your Map, Graph, and Canvas Work Together",
    });
    await articleLink.click();

    // Wait for navigation
    await expect(page).toHaveURL(/\/blog\/spatial-intelligence/);

    // Check title and metadata
    await expect(page).toHaveTitle(
      /Spatial Intelligence: How your Map, Graph, and Canvas Work Together/,
    );

    // Check article content
    const articleContent = page.locator(".blog-content");
    await expect(articleContent).toBeVisible();
    await expect(articleContent).toContainText(
      "The Tactical Map: Grounding Your Story",
    );
    await expect(articleContent).toContainText(
      "The Knowledge Graph: Visualizing the Web",
    );
    await expect(articleContent).toContainText(
      'The Freeform Canvas: Your Tactical "Murder Board"',
    );

    // Check cross-links
    const patreonLink = page.getByRole("link", {
      name: "original showcase on Patreon",
    });
    await expect(patreonLink).toBeVisible();
    await expect(patreonLink).toHaveAttribute(
      "href",
      "https://www.patreon.com/posts/showcase-see-151579891",
    );

    const sovereigntyLink = page.getByRole("link", {
      name: "Guide to Data Sovereignty",
    });
    await expect(sovereigntyLink).toBeVisible();
    await expect(sovereigntyLink).toHaveAttribute(
      "href",
      /gm-guide-data-sovereignty$/,
    );
  });

  test("should show 404 for non-existent article", async ({ page }) => {
    const response = await page.goto("/blog/non-existent-transmission");
    expect(response?.status()).toBeGreaterThanOrEqual(400);
  });

  test("should navigate to the blog from site chrome", async ({ page }) => {
    // This used to click a "Blog" link in the footer on `/`. Two things have
    // changed since: chunk 3 removed AppFooter from workspace routes, and the
    // marketing footer has no Blog link either (Terms, Privacy, Tools,
    // Sitemap, LLM Docs, Groupfinder). So the test was asserting on chrome
    // that exists nowhere, and had been failing on staging.
    //
    // The intent still holds, the mechanism moved: the shared shell's nav
    // carries "Devlog" on every public page.
    await page.goto("/tools");

    await page
      .getByTestId("shell-nav")
      .getByRole("link", { name: "Devlog" })
      .click();

    await expect(page).toHaveURL(/\/blog/);
    await expect(
      page.getByRole("heading", { name: "The Archive" }),
    ).toBeVisible();
  });
});

test.describe("Blog editorial structure", () => {
  test("presents the responsible-AI batch as one series, in reading order", async ({
    page,
  }) => {
    await page.goto("/blog");

    // Seven posts published on one day, two hours apart, listed as seven equal
    // standalone promotions is the "generated" signal the assessment names.
    // Their dates are untouched; only the framing changed.
    const series = page.getByTestId("blog-series-collection");
    await expect(series).toBeVisible();

    const items = series.locator("ol li a");
    await expect(items).toHaveCount(7);

    // Numbered by the series' own sequence, asserted by slug: RA_SERIES stores
    // its own short titles, while the list renders each post's real one. The
    // index sorts newest first, which would otherwise label the final part 01.
    await expect(items.first()).toHaveAttribute(
      "href",
      /lore-oracle-not-the-author$/,
    );
    await expect(items.last()).toHaveAttribute(
      "href",
      /revising-your-lore-with-the-oracle$/,
    );

    // And they are no longer also listed as standalone articles.
    const standalone = await page.locator("article h2 a").allTextContents();
    expect(standalone.join(" ")).not.toContain("Drafts Are Not Canon");
  });

  test("shows a revision date only when a post has one", async ({ page }) => {
    await page.goto("/blog/drafts-are-not-canon");

    // No post carries `updatedAt` yet, and none should claim to: a date
    // defaulted to publication would tell readers every post was revised the
    // day it was written.
    await expect(page.getByTestId("blog-updated")).toHaveCount(0);

    const ld = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const posting = ld
      .map((raw) => {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      })
      .find((j) => j?.["@type"] === "BlogPosting");
    expect(posting.dateModified).toBe(posting.datePublished);
  });

  test("renders exactly one header on mobile and desktop breakpoints for responsible-ai-worldbuilding", async ({
    page,
  }) => {
    // Desktop check
    await page.goto("/responsible-ai-worldbuilding");
    await expect(page.locator("header")).toHaveCount(1);
    await expect(page.getByTestId("shell-wordmark")).toBeVisible();
    await expect(page.getByTestId("shell-cta")).toBeVisible();

    // Mobile viewport check
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator("header")).toHaveCount(1);
    const menuToggle = page.getByTestId("shell-menu-toggle");
    await expect(menuToggle).toBeVisible();
    await expect(page.getByTestId("shell-mobile-nav")).toHaveCount(0);

    // Toggle menu
    await page.waitForLoadState("networkidle");
    await menuToggle.click();
    await expect(page.getByTestId("shell-mobile-nav")).toBeVisible();
    await expect(
      page
        .getByTestId("shell-mobile-nav")
        .getByRole("link", { name: "Devlog" }),
    ).toBeVisible();
  });
});

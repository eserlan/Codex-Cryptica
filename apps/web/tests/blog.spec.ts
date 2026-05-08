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

  test("should navigate to blog via footer link", async ({ page }) => {
    await page.goto("/");

    // Check if landing page is visible and enter if so
    const enterButton = page.getByRole("button", { name: "Enter the Codex" });
    if (await enterButton.isVisible()) {
      await enterButton.click();
    }

    const footerBlogLink = page
      .locator("footer")
      .getByRole("link", { name: "Blog" });
    await footerBlogLink.click();

    await expect(page).toHaveURL(/\/blog/);
    await expect(
      page.getByRole("heading", { name: "The Archive" }),
    ).toBeVisible();
  });
});

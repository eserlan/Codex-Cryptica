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
    const articleLink = page.getByText(/The GM’s Guide to Data Sovereignty/);
    await expect(articleLink).toBeVisible();
  });

  test("should navigate to and render the first article", async ({ page }) => {
    await page.goto("/blog");

    const articleLink = page.getByText(/The GM’s Guide to Data Sovereignty/);
    await articleLink.click();

    // Wait for navigation
    await expect(page).toHaveURL(/\/blog\/gm-guide-data-sovereignty/);

    // Check title and metadata
    await expect(page).toHaveTitle(/The GM’s Guide to Data Sovereignty/);

    // Check article content
    const articleContent = page.locator(".blog-content");
    await expect(articleContent).toBeVisible();
    await expect(articleContent).toContainText("What is 'Local-First'");
    await expect(articleContent).toContainText(
      "Setting Up Your Tactical Command Center",
    );

    // Check CTA button
    const ctaButton = page.getByRole("link", {
      name: "Initiate Surveillance",
      exact: true,
    });
    await expect(ctaButton).toBeVisible();
  });

  test("should show 404 for non-existent article", async ({ page }) => {
    await page.goto("/blog/non-existent-transmission");

    await expect(
      page.getByText(/Transmission not found in the archive/),
    ).toBeVisible();
  });
});

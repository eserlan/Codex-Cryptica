import { test, expect } from "@playwright/test";

test.describe("Changelog Page", () => {
  test("should load the changelog index page", async ({ page }) => {
    await page.goto("/changelog");

    // Check title
    await expect(page).toHaveTitle(/The Chronology | Codex Cryptica Changelog/);

    // Check heading
    const heading = page.getByRole("heading", {
      name: "The Chronology",
      exact: true,
    });
    await expect(heading).toBeVisible();

    // Check if the latest release is listed
    const releaseTitle = page.getByText(/The Tactical Explorer Update/);
    await expect(releaseTitle).toBeVisible();

    // Check for version badge
    const versionBadge = page.getByText(/v0.18.0/);
    await expect(versionBadge).toBeVisible();
  });

  test("should navigate to changelog via landing page link", async ({
    page,
  }) => {
    await page.goto("/");

    // Verify we are on the landing page (marketing layer)
    const landingHeading = page.getByText(/Build Your World./);
    await expect(landingHeading).toBeVisible();

    const changelogLink = page.getByRole("link", {
      name: "View Full Changelog",
    });
    await expect(changelogLink).toBeVisible();

    await changelogLink.click();

    // Wait for navigation
    await expect(page).toHaveURL(/\/changelog/);
    await expect(
      page.getByRole("heading", { name: "The Chronology" }),
    ).toBeVisible();
  });

  test("should support anchor links for versions", async ({ page }) => {
    await page.goto("/changelog#v0.17.0");

    // Check if the specific release is in view or at least exists

    const v0170 = page.locator("#v0\\.17\\.0");
    await expect(v0170).toBeAttached();

    const releaseTitle = page.getByText("The Playable Tabletop Update");
    await expect(releaseTitle).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";

test.describe("Changelog Page", () => {
  test("should load the changelog index page", async ({ page }) => {
    await page.goto("/changelog");

    // Check title
    await expect(page).toHaveTitle(
      /The Chronology \| Codex Cryptica Changelog/,
    );

    // Check heading
    const heading = page.getByRole("heading", {
      name: "The Chronology",
      exact: true,
    });
    await expect(heading).toBeVisible();

    // Check that at least one release entry is rendered
    const releaseAnchors = page.locator('[id^="v"]');
    await expect(releaseAnchors.first()).toBeAttached();
    await expect(releaseAnchors.first()).toBeVisible();
  });

  test("should navigate to changelog via landing page link", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("codex_skip_landing");
    });

    await page.goto("/");

    // Verify we are on the welcome landing page.
    const landingHeading = page.getByRole("heading", {
      name: "Private RPG Lore Vault",
    });
    await expect(landingHeading).toBeVisible();

    const changelogLink = page.getByRole("link", {
      name: "Changelog",
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
    await page.goto("/changelog#v0.26.0");

    // Check if the specific release is in view or at least exists

    const v0260 = page.locator("#v0\\.26\\.0");
    await expect(v0260).toBeAttached();

    const releaseTitle = page.getByText(
      "The Multi-Sensory & Interactive Chronology Update",
    );
    await expect(releaseTitle).toBeVisible();
  });
});

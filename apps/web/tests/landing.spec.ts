import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("should have a link to the features page", async ({ page }) => {
    test.setTimeout(90000);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Private RPG Lore Vault" }),
    ).toBeVisible({ timeout: 45000 });
    await expect(
      page.getByRole("heading", { level: 2, name: "Living Lore Graph" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "See how characters, factions, secrets, and places connect.",
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Quick Start generates a ready-to-explore world in seconds — pick a theme, add an optional premise, done. Optional AI is available when you want it; your vault works fully without it.",
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Optional AI is available when you want it; your vault works fully without it.",
      ),
    ).toBeVisible();
    await expect(page.getByText("Or start from a themed vault")).toBeVisible();

    const exploreLink = page.getByTestId("app-footer").getByRole("link", {
      name: "Explore",
      exact: true,
    });
    await expect(exploreLink).toBeVisible();
    await exploreLink.evaluate((el: HTMLAnchorElement) => el.click());
    await expect(page).toHaveURL(/.*\/explore/, { timeout: 45000 });

    const featuresLink = page.getByRole("link", {
      name: /^Features\b/i,
    });
    await expect(featuresLink).toBeVisible();

    // Test navigation
    await featuresLink.click();
    await expect(page).toHaveURL(/.*\/features/, { timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: "Core Features" }),
    ).toBeVisible();
  });
});

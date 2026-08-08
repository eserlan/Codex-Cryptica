import { test, expect } from "@playwright/test";

test.describe("Application shell footer", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );
    });
  });

  test("keeps legal links on public routes and removes their chrome after workspace navigation", async ({
    page,
  }) => {
    await page.goto("/tools");

    const publicFooter = page.locator("footer");
    await expect(
      publicFooter.getByRole("link", { name: "Terms" }),
    ).toBeVisible();
    await expect(
      publicFooter.getByRole("link", { name: "Privacy" }),
    ).toBeVisible();

    await page
      .getByRole("link", { name: "Codex Cryptica", exact: true })
      .click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator(".app-layout")).toBeVisible();
    await expect(
      page.locator("footer").filter({ hasText: "Support on Patreon" }),
    ).toHaveCount(0);
  });
});

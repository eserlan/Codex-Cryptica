import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("should have a link to the features page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Welcome to Codex Cryptica")).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: "Private RPG Lore Vault" }),
    ).toBeVisible();
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
        "Opens a prebuilt sample world instantly. No setup required.",
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Optional AI is available when you want it; your vault works fully without it.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Try a themed vault:" }),
    ).toBeVisible();

    const featuresLink = page.getByRole("main").getByRole("link", {
      name: "Features",
      exact: true,
    });
    await expect(featuresLink).toBeVisible();

    // Test navigation
    await featuresLink.click();
    await expect(page).toHaveURL(/.*\/features/);
    await expect(
      page.getByRole("heading", { name: "Core Features" }),
    ).toBeVisible();
  });
});

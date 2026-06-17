import { test, expect } from "@playwright/test";

const themes = [
  { slug: "fantasy", h1: "Fantasy RPG Generators", localStorageId: "fantasy" },
  {
    slug: "cyberpunk",
    h1: "Cyberpunk RPG Generators",
    localStorageId: "cyberpunk",
  },
  { slug: "sci-fi", h1: "Sci-Fi RPG Generators", localStorageId: "scifi" },
  {
    slug: "post-apocalyptic",
    h1: "Post-Apocalyptic RPG Generators",
    localStorageId: "apocalyptic",
  },
  { slug: "modern", h1: "Modern RPG Generators", localStorageId: "modern" },
  { slug: "vampire", h1: "Vampire RPG Generators", localStorageId: "horror" },
];

test.describe("Generator Theme Hubs", () => {
  for (const theme of themes) {
    test(`${theme.slug} hub renders correctly`, async ({ page }) => {
      await page.goto(`/generators/${theme.slug}`);

      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        theme.h1,
      );

      const cards = page.locator("ul > li > a");
      await expect(cards.first()).toBeVisible();
      const count = await cards.count();
      expect(count).toBeGreaterThanOrEqual(6);
    });
  }

  test("fantasy hub has 12 cards including tavern and surprise me", async ({
    page,
  }) => {
    await page.goto("/generators/fantasy");
    const cards = page.locator("ul > li > a");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBe(12);
    await expect(
      page.getByRole("link", { name: "Tavern Generator" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Surprise Me" })).toBeVisible();
  });

  test("non-fantasy hub has 8 cards including social hub and surprise me", async ({
    page,
  }) => {
    await page.goto("/generators/cyberpunk");
    const cards = page.locator("ul > li > a");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBe(8);
    await expect(
      page.getByRole("link", { name: "Social Hub Generator" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Surprise Me" })).toBeVisible();
  });

  test("vampire hub has 9 cards including clan generator and surprise me", async ({
    page,
  }) => {
    await page.goto("/generators/vampire");
    const cards = page.locator("ul > li > a");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBe(9);
    await expect(
      page.getByRole("link", { name: "Vampire Clan Generator" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Surprise Me" })).toBeVisible();
  });

  test("visiting a hub applies its theme immediately", async ({ page }) => {
    await page.goto("/generators/cyberpunk");

    await expect
      .poll(() =>
        page.evaluate(() =>
          localStorage.getItem("codex-cryptica-active-theme"),
        ),
      )
      .toBe("cyberpunk");

    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.dataset.worldTheme),
      )
      .toBe("cyberpunk");
  });

  test("card click sets correct localStorage theme and navigates", async ({
    page,
  }) => {
    await page.goto("/generators/cyberpunk");

    const firstCard = page.locator("ul > li > a").first();
    const href = await firstCard.getAttribute("href");

    await firstCard.click();

    await expect
      .poll(() =>
        page.evaluate(() =>
          localStorage.getItem("codex-cryptica-active-theme"),
        ),
      )
      .toBe("cyberpunk");

    await expect(page).toHaveURL(
      new RegExp(href!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"),
    );
  });

  test("unknown theme returns 404", async ({ page }) => {
    const res = await page.goto("/generators/steampunk");
    expect(res?.status()).toBe(404);
  });

  test("theme hub index shows Browse by Theme section", async ({ page }) => {
    await page.goto("/generators");
    await expect(
      page.getByRole("heading", { name: "Browse by Theme" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Fantasy Hub" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Vampire Hub" })).toBeVisible();
  });
});

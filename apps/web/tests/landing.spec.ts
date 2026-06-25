import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });
    page.on("pageerror", (err) => {
      console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`);
    });
  });

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

  test("should open the getting started guide from the CTA button and footer link", async ({
    page,
  }) => {
    await page.goto("/");

    // 1. Check CTA button
    const ctaGuideBtn = page.getByTestId("welcome-guide-button");
    await expect(ctaGuideBtn).toBeVisible();
    await ctaGuideBtn.click();

    // The settings modal with help tab should open
    await expect(page.getByTestId("settings-modal")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Help" })).toBeVisible();
    await expect(page.getByText("Getting Started").first()).toBeVisible();

    // Close settings modal
    await page.getByRole("button", { name: "Close Settings" }).click();
    await expect(page.getByTestId("settings-modal")).not.toBeVisible();

    // 2. Check footer link
    const footerGuideLink = page.getByTestId("welcome-guide-link");
    await expect(footerGuideLink).toBeVisible();
    await footerGuideLink.click();

    await expect(page.getByTestId("settings-modal")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Help" })).toBeVisible();
    await expect(page.getByText("Getting Started").first()).toBeVisible();
  });
});

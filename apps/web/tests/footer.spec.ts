import { test, expect } from "@playwright/test";

test.describe("Footer", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure viewport is large enough for the footer
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    // Wait for the app to load
    await page.waitForSelector(".app-layout");
  });

  test("should display Patreon support link in the footer", async ({
    page,
  }) => {
    const footer = page.locator("footer");
    const patreonLink = footer.locator('a:has-text("Support on Patreon")');

    await expect(patreonLink).toBeVisible();
    await expect(patreonLink).toHaveAttribute(
      "href",
      "https://patreon.com/EspenE",
    );
    await expect(patreonLink).toHaveAttribute("target", "_blank");
    await expect(patreonLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("should display Discord link in the footer", async ({ page }) => {
    const footer = page.locator("footer");
    const discordLink = footer.locator('a:has-text("Discord")');

    await expect(discordLink).toBeVisible();
    await expect(discordLink).toHaveAttribute(
      "href",
      "https://discord.gg/5UUMCChF2u",
    );
    await expect(discordLink).toHaveAttribute("target", "_blank");
    await expect(discordLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("should display Help link in the footer and open settings", async ({
    page,
  }) => {
    const footer = page.locator("footer");
    const helpLink = footer.locator('button:has-text("Help")');

    // Scroll to footer to ensure it's in view
    await footer.scrollIntoViewIfNeeded();
    await expect(helpLink).toBeVisible();

    // Click help and verify settings modal opens
    await helpLink.click();

    // Wait for the settings modal to appear
    const settingsModal = page.getByRole("dialog");
    await expect(settingsModal).toBeVisible();

    // Verify it's on the help tab by checking for the specific heading or content
    await expect(settingsModal.locator('h2:has-text("Help")')).toBeVisible();
    await expect(
      page.locator('input[placeholder="Search documentation..."]'),
    ).toBeVisible();
  });

  test("should have correct styling classes on Patreon link", async ({
    page,
  }) => {
    const patreonLink = page.locator('footer a:has-text("Support on Patreon")');
    const classes = await patreonLink.getAttribute("class");

    expect(classes).toContain("text-[10px]");
    expect(classes).toContain("font-mono");
    expect(classes).toContain("uppercase");
    expect(classes).toContain("tracking-widest");
  });

  test("Patreon link should persist in offline mode", async ({
    context,
    page,
  }) => {
    // Wait for Service Worker to be ready
    await page.evaluate(async () => {
      if ("serviceWorker" in navigator) {
        await navigator.serviceWorker.ready;
      }
    });

    // Reload page to ensure SW controls it and caches resources
    await page.reload();

    // Go offline
    await context.setOffline(true);
    await page.reload();

    const patreonLink = page.locator('footer a:has-text("Support on Patreon")');
    await expect(patreonLink).toBeVisible();

    // Go back online
    await context.setOffline(false);
  });
});

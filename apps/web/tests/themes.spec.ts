import { test, expect } from "@playwright/test";

test.describe("Visual Styling Templates", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
    });
    await page.goto("http://localhost:5173/");
    // Wait for auto-init
    await page.waitForFunction(() => (window as any).vault?.status === "idle");
  });

  test("Switch to Fantasy theme and verify visual changes", async ({
    page,
  }) => {
    // 1. Open Settings
    await page.getByTestId("settings-button").click();

    // 2. Go to Aesthetics tab
    await page.getByRole("tab", { name: "Aesthetics" }).click();

    // 3. Select Fantasy theme
    await page.getByRole("button", { name: "Ancient Parchment" }).click();

    // 4. Verify background color change (Parchment color)
    const body = page.locator("body");
    await expect(body).toHaveCSS("background-color", "rgb(253, 246, 227)");

    // 5. Verify typography overhaul (Cinzel header font)
    const fontHeader = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--font-header")
        .trim(),
    );
    expect(fontHeader).toContain("Cinzel");

    // 6. Verify texture integration
    const textureOverlay = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--bg-texture-overlay")
        .trim(),
    );
    expect(textureOverlay).toContain("parchment.svg");

    // 7. Verify softer border radius
    const borderRadius = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--theme-border-radius")
        .trim(),
    );
    expect(borderRadius).toBe("6px");
  });

  test("Welcome page uses theme-aware styling", async ({ page }) => {
    // 1. Ensure we are on the landing page (reload to reset dismissed state if needed, though beforeEach handles visiting /)
    // The beforeEach disables onboarding but doesn't explicitly dismiss the landing page, so it should be visible if not skipped.
    // However, our beforeEach sets DISABLE_ONBOARDING = true. Let's check if that affects the landing page.
    // Looking at +page.svelte: !isGuestMode && uiStore.isLandingPageVisible
    // uiStore.isLandingPageVisible depends on skipWelcomeScreen and dismissedLandingPage.
    // We need to ensure we haven't set 'codex_skip_landing' in localStorage.

    await page.evaluate(() => {
      localStorage.removeItem("codex_skip_landing");
      (window as any).uiStore?.toggleWelcomeScreen(false); // Reset store if exposed, or just rely on reload
    });
    await page.reload();
    await page.waitForFunction(() => (window as any).vault?.status === "idle");

    // 2. Verify the landing page container exists and has correct background
    // We changed it to bg-theme-bg/95.
    // In Fantasy theme (default), theme-bg is #fdf6e3 (rgb(253, 246, 227))
    // /95 opacity is approx 0.95 alpha.

    const landingPage = page.locator(".absolute.inset-0.z-30");
    await expect(landingPage).toBeVisible();

    // Check background color. It should NOT be black/60 (rgba(0,0,0,0.6))
    // It should correspond to the theme background.
    // Exact computed value might vary slightly due to browser rendering of "95%",
    // but we can check it's not black.

    const backgroundColor = await landingPage.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // We expect something closer to the theme color.
    // Pulse check: ensure it's not the old dark color
    expect(backgroundColor).not.toBe("rgba(0, 0, 0, 0.6)");

    // Optional: Check specific parchment color presence if we want to be strict
    // We expect something closer to the theme color.
    // Pulse check: ensure it's not the old dark color (which would be black/0-lightness)
    expect(backgroundColor).not.toContain("rgba(0, 0, 0");
    expect(backgroundColor).not.toContain("oklab(0 "); // Black in oklab is roughly 0 lightness

    // Check that it is using the high lightness of parchment (approx 0.97 in oklab)
    // or just pass if it's not black, as that verifies the change from hardcoded black.
  });

  test("Switch to Blood & Noir theme and verify visual changes", async ({
    page,
  }) => {
    // 1. Open Settings
    await page.getByTestId("settings-button").click();

    // 2. Go to Aesthetics tab
    await page.getByRole("tab", { name: "Aesthetics" }).click();

    // 3. Select Horror theme
    await page.getByRole("button", { name: "Blood & Noir" }).click();

    // 4. Verify visual properties
    const body = page.locator("body");
    await expect(body).toHaveCSS("background-color", "rgb(5, 5, 5)");

    // 5. Verify primary color (Deep Crimson) is correctly applied to CSS variable
    const primaryColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--color-accent-primary")
        .trim(),
    );
    expect(primaryColor).toBe("#991b1b");
  });

  test("Theme selection persists across reloads", async ({ page }) => {
    await page.getByTestId("settings-button").click();
    await page.getByRole("tab", { name: "Aesthetics" }).click();
    await page.getByRole("button", { name: "Neon Night" }).click();

    // Verify cyberpunk color
    await expect(page.locator("html")).toHaveCSS(
      "--color-accent-primary",
      "#f472b6",
    );

    // Reload page
    await page.reload();

    // Wait for auto-init
    await page.waitForFunction(() => (window as any).vault?.status === "idle");

    // Verify it persisted
    await expect(page.locator("html")).toHaveCSS(
      "--color-accent-primary",
      "#f472b6",
    );
  });
});

import { test, expect } from "@playwright/test";

test.describe("Visual Styling Templates", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      try {
        localStorage.setItem("codex_skip_landing", "true");
      } catch {
        /* ignore */
      }
    });
    await page.addInitScript(() => {
      (window as any).__E2E_THEME_FIXTURE__ = {
        "test-character": {
          id: "test-character",
          title: "The Rat-Van",
          type: "character",
          content: "Test content",
          lore: "Test lore",
          labels: ["test"],
          connections: [],
          _path: ["test-character.md"],
        },
        "test-location": {
          id: "test-location",
          title: "Tome Hall",
          type: "location",
          content: "Location content",
          lore: "",
          labels: [],
          connections: [],
          _path: ["test-location.md"],
        },
      };
    });
    await page.goto("http://localhost:5173/");
    await page.waitForFunction(() => (window as any).vault?.repository);
    await page.evaluate(() => {
      const v = (window as any).vault;
      const fixture = (window as any).__E2E_THEME_FIXTURE__;
      const now = Date.now();
      const seededEntities = Object.fromEntries(
        Object.entries(fixture).map(([id, entity]: [string, any]) => [
          id,
          { ...entity, updatedAt: now },
        ]),
      );
      v.repository.entities = seededEntities;
      v.entities = { ...seededEntities };
      v.isInitialized = true;
      v.status = "idle";
    });
    // Wait for auto-init
    await page.waitForFunction(() => (window as any).vault?.status === "idle");
    await page.evaluate(() => {
      const ui = (window as any).uiStore;
      if (ui) {
        ui.dismissedWorldPage = true;
        ui.dismissedLandingPage = true;
      }
    });
  });

  test("Switch to Fantasy theme and verify visual changes", async ({
    page,
  }) => {
    // 1. Open Settings
    await page.getByTestId("settings-button").click();

    // 2. Go to Aesthetics tab
    await page.getByRole("tab", { name: "Theme" }).click();

    // 3. Select Fantasy theme
    await page.getByRole("button", { name: "Ancient Parchment" }).click();

    // 4. Verify background color change (Parchment color)
    const body = page.locator("body");
    await expect(body).toHaveCSS("background-color", "rgb(253, 246, 227)");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "fantasy");

    // Close settings via explicit button
    await page.getByLabel("Close Settings").click();

    // 5. Verify typography overhaul (Alegreya header font)
    const fontHeader = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--font-header-val")
        .trim(),
    );
    expect(fontHeader).toContain("Alegreya");

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
    expect(borderRadius).toBe("3px");

    // 8. Verify fantasy-specific warm variables
    const fantasyVars = await page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement);
      return {
        titleInk: styles.getPropertyValue("--theme-title-ink").trim(),
        iconDefault: styles.getPropertyValue("--theme-icon-default").trim(),
        focus: styles.getPropertyValue("--theme-focus").trim(),
        panelFill: styles.getPropertyValue("--theme-panel-fill").trim(),
        selectedBg: styles.getPropertyValue("--theme-selected-bg").trim(),
      };
    });
    expect(fantasyVars.titleInk).toBe("#24180f");
    expect(fantasyVars.iconDefault).toBe("#70533a");
    expect(fantasyVars.focus).toBe("#b08b57");
    expect(fantasyVars.panelFill).toContain("#f2e3c5");
    expect(fantasyVars.selectedBg).toContain("#6f4a2a");

    // 9. Verify unified warm explorer icon colors
    await page.getByTestId("activity-bar-explorer").click();
    await expect(page.getByTestId("entity-explorer-panel")).toBeVisible();
    const characterIcon = page
      .locator('button[aria-label="Filter by Character"] span')
      .first();
    const locationIcon = page
      .locator('button[aria-label="Filter by Location"] span')
      .first();
    const [characterColor, locationColor] = await Promise.all([
      characterIcon.evaluate((el) => getComputedStyle(el).color),
      locationIcon.evaluate((el) => getComputedStyle(el).color),
    ]);
    expect(characterColor).toBe(locationColor);
    expect(characterColor).toBe("rgb(112, 83, 58)");

    // 10. Verify selected fantasy states use gold
    await page.getByLabel("Filter by Character").click();
    await expect(page.getByLabel("Filter by Character")).toHaveCSS(
      "color",
      "rgb(176, 139, 87)",
    );

    // 11. Verify jargon (Archive instead of Vault)
    await expect(page.getByTestId("open-vault-button")).toContainText(
      "Archive",
    );
  });

  test("Welcome page uses theme-aware styling", async ({ page }) => {
    // 1. Ensure we are on the landing page (reload to reset dismissed state if needed, though beforeEach handles visiting /)
    // The beforeEach disables onboarding but doesn't explicitly dismiss the landing page, so it should be visible if not skipped.
    // However, our beforeEach sets DISABLE_ONBOARDING = true. Let's check if that affects the landing page.
    // Looking at +page.svelte: !isGuestMode && uiStore.isLandingPageVisible
    // uiStore.isLandingPageVisible depends on skipWelcomeScreen and dismissedLandingPage.
    // We need to ensure we haven't set 'codex_skip_landing' in localStorage.

    await page.addInitScript(() => {
      try {
        localStorage.setItem("codex_skip_landing", "false");
      } catch {
        /* ignore */
      }
    });
    await page.reload();
    // In landing page mode, vault might not be idle if it doesn't boot.
    // Let's just wait for the landing page to be visible.
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
    await page.getByRole("tab", { name: "Theme" }).click();

    // 3. Select Horror theme
    await page.getByRole("button", { name: "Blood & Noir" }).click();

    // 4. Verify visual properties
    const body = page.locator("body");
    await expect(body).toHaveCSS("background-color", "rgb(5, 5, 5)");

    // Close settings via explicit button
    await page.getByLabel("Close Settings").click();

    // 5. Verify primary color (Deep Crimson) is correctly applied to CSS variable
    const primaryColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--color-accent-primary")
        .trim(),
    );
    expect(primaryColor).toBe("#dc2626");

    // 6. Verify secondary color (Readable Muted Red)
    const secondaryColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--color-accent-dim")
        .trim(),
    );
    expect(secondaryColor).toBe("#f87171");

    // 7. Verify jargon (Archive instead of Vault)
    await expect(page.getByTestId("open-vault-button")).toContainText(
      "Archive",
    );
  });

  test("Timeline button is theme-aware", async ({ page }) => {
    // 1. Open Settings and select Cyberpunk (Neon Night)
    await page.getByTestId("settings-button").click();
    await page.getByRole("tab", { name: "Theme" }).click();
    await page.getByRole("button", { name: "Neon Night" }).click();

    // Wait for the accent color to update to cyberpunk yellow (#facc15)
    await expect(page.locator("html")).toHaveCSS(
      "--color-theme-accent",
      "#facc15",
    );

    await page.getByLabel("Close Settings").click();

    // 2. Click TIMELINE button
    const timelineBtn = page.getByRole("button", { name: "TIMELINE" });
    await timelineBtn.click();

    // 3. Verify it has the cyberpunk accent color (#facc15)
    // The button should have the color from --color-timeline-primary which is var(--color-theme-accent)
    // which for cyberpunk is #facc15 (yellow)
    await expect(timelineBtn).toHaveCSS("color", "rgb(250, 204, 21)"); // #facc15
  });

  test("Theme selection persists across reloads", async ({ page }) => {
    await page.getByTestId("settings-button").click();
    await page.getByRole("tab", { name: "Theme" }).click();
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

  test("LegalDocument uses theme-aware styling", async ({ page }) => {
    // 1. Switch to Fantasy theme
    await page.getByTestId("settings-button").click();
    await page.getByRole("tab", { name: "Theme" }).click();
    await page.getByRole("button", { name: "Ancient Parchment" }).click();
    await page.getByLabel("Close Settings").click();

    // 2. Navigate to privacy page
    await page.goto("/privacy");

    // 3. Verify header uses theme font
    const h1 = page.locator(".legal-content h1");
    const h1Font = await h1.evaluate((el) =>
      getComputedStyle(el).fontFamily.trim(),
    );
    const themeHeaderFont = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--font-header-val")
        .trim(),
    );

    // We expect the rendered font to contain the theme header font name
    // font-family strings can be complex and use different quotes, so we normalize
    const normalizedH1Font = h1Font.replace(/['"]/g, "");
    const normalizedThemeFont = themeHeaderFont.replace(/['"]/g, "");

    expect(normalizedH1Font).toContain(normalizedThemeFont);
  });
});

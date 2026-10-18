import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Fantasy Dark-Mode Answer Pages Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("codex-cryptica-active-theme", "fantasy");
        localStorage.setItem("codex-cryptica-app-appearance", "neutral-dark");
        localStorage.setItem("codex_skip_landing", "true");
      } catch {
        /* ignore */
      }
    });
  });

  test("Representative answer page in fantasy_dark passes WCAG AA contrast and axe checks", async ({
    page,
  }) => {
    // Navigate to a representative answer page
    await page.goto("/answers/what-is-a-point-crawl");
    await page.waitForLoadState("domcontentloaded");

    // Verify theme resolved to fantasy_dark and appearance to neutral-dark
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "fantasy_dark");
    await expect(html).toHaveAttribute("data-app-appearance", "neutral-dark");

    // 1. Verify CSS custom properties are set
    const themeMuted = await html.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--color-text-muted").trim(),
    );
    expect(themeMuted).toBe("#bfa68b");

    const textPrimary = await html.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--text-primary").trim(),
    );
    expect(textPrimary).toBe("#e8ddc4");

    const textMuted = await html.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--text-muted").trim(),
    );
    expect(textMuted).toBe("#bfa68b");

    // 2. Verify target sizes meet WCAG 2.2 2.5.8 (>= 24x24 px)
    const cta = page.getByTestId("shell-cta");
    await expect(cta).toBeVisible();
    const ctaBox = await cta.boundingBox();
    expect(ctaBox).not.toBeNull();
    expect(ctaBox!.width).toBeGreaterThanOrEqual(24);
    expect(ctaBox!.height).toBeGreaterThanOrEqual(24);

    const discordLink = page.getByTestId("shell-discord-link");
    if (await discordLink.isVisible()) {
      const discordBox = await discordLink.boundingBox();
      expect(discordBox).not.toBeNull();
      expect(discordBox!.width).toBeGreaterThanOrEqual(24);
      expect(discordBox!.height).toBeGreaterThanOrEqual(24);
    }

    const githubLink = page.getByTestId("shell-github-link");
    if (await githubLink.isVisible()) {
      const githubBox = await githubLink.boundingBox();
      expect(githubBox).not.toBeNull();
      expect(githubBox!.width).toBeGreaterThanOrEqual(24);
      expect(githubBox!.height).toBeGreaterThanOrEqual(24);
    }

    const breadcrumb = page.getByRole("link", { name: "All answers" });
    await expect(breadcrumb).toBeVisible();
    const breadcrumbBox = await breadcrumb.boundingBox();
    expect(breadcrumbBox).not.toBeNull();
    expect(breadcrumbBox!.height).toBeGreaterThanOrEqual(24);

    // 3. Verify Open Codex CTA in interactive states
    // Focus CTA with keyboard
    await cta.focus();
    await expect(cta).toBeFocused();

    // 4. Verify WCAG 1.4.12 Text Spacing overrides
    await page.addStyleTag({
      content: `
        * {
          line-height: 1.5 !important;
          letter-spacing: 0.12em !important;
          word-spacing: 0.16em !important;
        }
        p {
          margin-bottom: 2em !important;
        }
      `,
    });

    // Content should remain visible and not clipped
    const article = page.locator("article");
    await expect(article).toBeVisible();
    const articleBox = await article.boundingBox();
    expect(articleBox).not.toBeNull();
    expect(articleBox!.height).toBeGreaterThan(100);

    // Ensure no horizontal document overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // 5. Automated accessibility analysis via axe-core
    const axeResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const blockingViolations = axeResults.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    );

    expect(
      blockingViolations,
      `Unexpected blocking a11y violations: ${JSON.stringify(blockingViolations, null, 2)}`,
    ).toEqual([]);
  });

  test("Answers index page in fantasy_dark satisfies target size and a11y", async ({
    page,
  }) => {
    await page.goto("/answers");
    await page.waitForLoadState("domcontentloaded");

    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "fantasy_dark");

    // Search input and clear button target size
    const searchInput = page.locator("#answers-search");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("combat");

    const clearButton = page.getByRole("button", { name: "Clear search" });
    await expect(clearButton).toBeVisible();
    const clearBox = await clearButton.boundingBox();
    expect(clearBox).not.toBeNull();
    expect(clearBox!.width).toBeGreaterThanOrEqual(24);
    expect(clearBox!.height).toBeGreaterThanOrEqual(24);

    // Run axe on answers index
    const axeResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const blockingViolations = axeResults.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    );

    expect(blockingViolations).toEqual([]);
  });
});

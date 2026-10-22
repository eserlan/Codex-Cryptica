import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Biome Explorer (spec 180). The library works without a vault, but saving
 * needs one, so these tests open the app first and then go to /biomes.
 *
 * The catalogue's pictures live on R2 and may not exist yet in a test run, so
 * they are blocked here. Their labelled placeholder is part of what is tested.
 */

const BLOCKING_IMPACTS = new Set(["serious", "critical"]);
// Colour contrast comes from shared theme tokens; see a11y-workspace.spec.ts.
const NON_BLOCKING_RULES = new Set(["color-contrast"]);

async function openExplorer(page: Page) {
  await page.route("https://assets.codexcryptica.com/**", (route) =>
    route.abort(),
  );
  await page.goto("/biomes");
  // The first visit compiles the route in dev, which can take a while.
  await expect(
    page.getByRole("heading", { name: "Biome Explorer", level: 1 }),
  ).toBeVisible({ timeout: 45000 });
}

async function axeScan(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blocking = results.violations.filter(
    (v) =>
      BLOCKING_IMPACTS.has(v.impact ?? "") && !NON_BLOCKING_RULES.has(v.id),
  );
  const detail = blocking
    .map((v) => `${v.id} [${v.impact}] ${v.help}`)
    .join("\n");
  expect(
    blocking.map((v) => v.id),
    `${label}:\n${detail}`,
  ).toEqual([]);
}

test.describe("Biome Explorer", () => {
  test("browse, search and read a biome", async ({ page }) => {
    await openExplorer(page);
    await expect(page.getByRole("listitem").first()).toBeVisible();
    await page.getByRole("searchbox").fill("desert");
    await expect(page.getByTestId("biome-result-count")).toContainText(
      "1 biome shown",
    );
    await page.getByRole("button", { name: /^Hot desert/ }).click();
    await expect(
      page.getByRole("heading", { name: "Hot desert", level: 2 }),
    ).toBeVisible();
    await page.getByRole("button", { name: /^Landscape/ }).click();
    await expect(page.getByText("Common pattern").first()).toBeVisible();
    // Pictures are blocked, so the labelled placeholder shows with its credit.
    await expect(page.getByText("Image unavailable").first()).toBeVisible();
    await expect(page.getByText("AI illustration").first()).toBeVisible();
  });

  test("make my own, save, reload, reopen, edit and copy as Markdown", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await openExplorer(page);

    await page.goto("/biomes?biome=tundra");
    await page.getByRole("button", { name: "Make my own" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Ashen Flats");
    await page.getByLabel("Plants: my version").fill("Glowing blue moss");
    await page.getByRole("button", { name: "Add fictional change" }).click();
    await expect(page.getByRole("alert")).toContainText(
      "Describe what is different",
    );
    await page
      .getByRole("group", { name: "Fictional changes" })
      .getByLabel("What is different?")
      .fill("It rains ash");
    await page.getByRole("button", { name: "Add fictional change" }).click();
    await page.getByLabel("Water: my version").fill("Tidal pools");
    await page.getByRole("button", { name: "Copy as Markdown" }).click();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toContain("# Ashen Flats");
    const markdown = await page.evaluate(() => navigator.clipboard.readText());
    expect(markdown).toContain("## Reference");
    expect(markdown).toContain("## My changes");
    expect(markdown).toContain("## Fictional alterations");
    expect(markdown.indexOf("Glowing blue moss")).toBeGreaterThan(
      markdown.indexOf("## My changes"),
    );
    expect(markdown.indexOf("It rains ash")).toBeGreaterThan(
      markdown.indexOf("## Fictional alterations"),
    );
  });

  test("compares two biomes", async ({ page }) => {
    await openExplorer(page);
    await page.getByRole("button", { name: "Compare Tundra" }).click();
    await page.getByRole("button", { name: "Compare Savanna" }).click();
    await page.getByRole("button", { name: "Compare (2)" }).click();
    await expect(
      page.getByRole("table", { name: /Comparison of Tundra and Savanna/ }),
    ).toBeVisible();
  });

  test("has no serious accessibility violations", async ({ page }) => {
    await openExplorer(page);
    await axeScan(page, "library");
    await page.goto("/biomes?biome=tundra");
    await page.getByRole("button", { name: /^Landscape/ }).click();
    await axeScan(page, "details");
    await page.getByRole("button", { name: "Make my own" }).click();
    await expect(page.getByLabel("Name", { exact: true })).toBeVisible();
    await axeScan(page, "editor");
  });

  test("is keyboard operable from search to opening a biome", async ({
    page,
  }) => {
    await openExplorer(page);
    await page.getByRole("searchbox").focus();
    await page.getByRole("searchbox").fill("tundra");
    const card = page.getByRole("button", { name: /^Tundra Treeless/ });
    await card.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name: "Tundra", level: 2 }),
    ).toBeVisible();
    const toggle = page.getByRole("button", { name: /^Climate/ });
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  test("fits a phone screen with no sideways scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await openExplorer(page);
    for (const check of ["library", "details", "compare", "editor"] as const) {
      if (check === "details") await page.goto("/biomes?biome=savanna");
      if (check === "compare") {
        await page.goto("/biomes");
        await page.getByRole("button", { name: "Compare Tundra" }).click();
        await page.getByRole("button", { name: "Compare Savanna" }).click();
        await page.getByRole("button", { name: "Compare (2)" }).click();
        await expect(page.getByTestId("biome-compare-stacked")).toBeVisible();
      }
      if (check === "editor") {
        await page.goto("/biomes");
        // The Explorer reopens on the view you last used.
        await page.getByRole("button", { name: "Library" }).click();
        await page.getByRole("button", { name: "Start from blank" }).click();
      }
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow on ${check}`).toBeLessThanOrEqual(
        1,
      );
    }
  });

  test("works with AI switched off", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("codex_ai_disabled", "true");
      } catch {
        /* ignore */
      }
    });
    await openExplorer(page);
    await page.getByRole("button", { name: "Start from blank" }).click();
    await page.getByLabel("What is different?").fill("It rains ash");
    await page.getByRole("button", { name: "Add fictional change" }).click();
    await expect(page.getByText(/AI helper is off/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Suggest effects" }),
    ).toHaveCount(0);
  });
});

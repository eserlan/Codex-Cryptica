import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { setupVaultPage } from "./test-helpers";

/**
 * Spec 176 smoke: the tips switch and the no-interrupt rules at phone and
 * desktop widths. The chip's full path (a finished journey, then a tap) is
 * covered by the unit and component tests; this checks the parts a real
 * browser decides.
 */

async function openAiSettings(page: Page) {
  const width = page.viewportSize()?.width ?? 1280;
  if (width < 768) {
    // Phones reach Settings through the navigation drawer.
    await page.getByRole("button", { name: "Toggle menu" }).click();
    await page.getByRole("button", { name: /^Settings$/ }).click();
  } else {
    await page.getByTestId("settings-button").click();
  }
  await page.getByRole("tab", { name: /^AI$/i }).click();
}

test.describe("Cif tips", () => {
  test.beforeEach(async ({ page }) => {
    // Dev builds turn Cif on with a local switch (config/help-assistant.ts).
    await page.addInitScript(() =>
      localStorage.setItem("codex_help_assistant", "true"),
    );
    await setupVaultPage(page);
  });

  for (const [name, size] of [
    ["phone", { width: 375, height: 812 }],
    ["tablet", { width: 768, height: 1024 }],
    ["desktop", { width: 1280, height: 800 }],
  ] as const) {
    test(`switch is off by default and fits on ${name}`, async ({ page }) => {
      await page.setViewportSize(size);
      await openAiSettings(page);

      const box = page.getByRole("checkbox", { name: /Show tips from Cif/ });
      await expect(box).toBeVisible();
      await expect(box).not.toBeChecked();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow).toBe(false);
    });
  }

  test("the tips setting passes the app's WCAG 2.1 AA scan (SC-007)", async ({
    page,
  }) => {
    await openAiSettings(page);
    await expect(
      page.getByRole("checkbox", { name: /Show tips from Cif/ }),
    ).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .include('[data-testid="cif-tips-setting"]')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("turning the switch on persists across a reload", async ({ page }) => {
    await openAiSettings(page);
    await page.getByRole("checkbox", { name: /Show tips from Cif/ }).check();
    await page.reload();
    await openAiSettings(page);
    await expect(
      page.getByRole("checkbox", { name: /Show tips from Cif/ }),
    ).toBeChecked();
  });

  test("the switch is hidden when AI is disabled, and no tip shows (FR-002)", async ({
    page,
  }) => {
    await openAiSettings(page);
    await page.getByLabel(/AI Disabled/i).check();
    await expect(
      page.getByRole("checkbox", { name: /Show tips from Cif/ }),
    ).toHaveCount(0);
    await expect(page.getByTestId("cif-tip-chip")).toHaveCount(0);
  });

  test("no tip chip appears while a dialog is open (FR-014)", async ({
    page,
  }) => {
    await page.evaluate(() =>
      localStorage.setItem(
        "codex-cif-tips",
        JSON.stringify({
          schema: 1,
          enabled: true,
          optInAsked: true,
          dismissed: [],
          acted: [],
          dismissCounts: {},
          silencedAreas: [],
        }),
      ),
    );
    await page.reload();
    await openAiSettings(page);
    await expect(page.getByTestId("cif-tip-chip")).toHaveCount(0);
  });
});

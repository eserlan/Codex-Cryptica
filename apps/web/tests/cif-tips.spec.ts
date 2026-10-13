import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { setupVaultPage } from "./test-helpers";

// The "what's new" dialog opens on a fresh profile and would block tips; mark the latest release seen.
const LATEST_RELEASE: string = JSON.parse(
  readFileSync(
    new URL("../src/lib/content/changelog/releases.json", import.meta.url),
    "utf8",
  ),
)[0].version;

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

test.describe("Cif tip chip placement (spec 176, plan D7)", () => {
  // Seeds a finished world goal with tips on, then opens the graph, the screen
  // the world goal has a tip for (research D8 excludes only the map).
  async function seedTipReady(page: Page) {
    await page.addInitScript(() =>
      localStorage.setItem("codex_help_assistant", "true"),
    );
    await setupVaultPage(page);
    const vaultId = await page.evaluate(
      () => (window as any).vault.activeVaultId as string,
    );
    await page.evaluate(
      ({ id, latest }) => {
        localStorage.setItem(
          `codex-onboarding-journey:${id}`,
          JSON.stringify({
            schema: 1,
            journeyId: "worldbuilder",
            journeyVersion: 1,
            startedAt: Date.now(),
            completed: [],
            skipped: [],
            viewing: null,
            outcome: "exited",
          }),
        );
        localStorage.setItem("codex_goal_invitation", "goal");
        localStorage.setItem("codex_last_seen_version", latest);
        localStorage.setItem("codex_chosen_goal", "world");
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
        );
        sessionStorage.clear();
      },
      { id: vaultId, latest: LATEST_RELEASE },
    );
    // setupVaultPage's init script re-marks the invitation dismissed on every load; run after it.
    await page.addInitScript(() =>
      localStorage.setItem("codex_goal_invitation", "goal"),
    );
    await page.reload();
    // The tip needs the vault's guided-setup record, which loads only once the
    // vault is initialised. Under load that takes longer than the default
    // expect timeout, and `status === "idle"` comes before it, so wait on it.
    await page.waitForFunction(
      () => (window as any).vault?.isInitialized === true,
      undefined,
      { timeout: 30000 },
    );
  }

  for (const [name, size] of [
    ["phone", { width: 375, height: 812 }],
    ["desktop", { width: 1280, height: 800 }],
  ] as const) {
    test(`chip sits beside the Cif button on ${name}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(size);
      await seedTipReady(page);

      const chip = page.getByTestId("cif-tip-chip");
      await expect(chip).toBeVisible();
      const button = page.getByTestId("help-assistant-button");
      await expect(button).toBeVisible();

      // Anchored: the chip is positioned from the button, not the fixed corner.
      const chipBox = await chip.boundingBox();
      const buttonBox = await button.boundingBox();
      expect(chipBox).not.toBeNull();
      expect(buttonBox).not.toBeNull();
      const gap =
        size.width >= 768
          ? chipBox!.x - (buttonBox!.x + buttonBox!.width) // beside, to the right
          : buttonBox!.y - (chipBox!.y + chipBox!.height); // above, on phones
      expect(gap).toBeGreaterThanOrEqual(0);
      expect(gap).toBeLessThan(40);

      // Stays on screen and out of the way of the Cif button itself.
      expect(chipBox!.x).toBeGreaterThanOrEqual(0);
      expect(chipBox!.x + chipBox!.width).toBeLessThanOrEqual(size.width);

      await page.screenshot({
        path: testInfo.outputPath(`cif-tip-${name}.png`),
        fullPage: false,
      });
    });
  }

  test("tapping the chip asks Cif, and dismissing it keeps it gone after reload", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await seedTipReady(page);
    await expect(page.getByTestId("cif-tip-chip")).toBeVisible();
    await page.getByTestId("cif-tip-dismiss").click();
    await expect(page.getByTestId("cif-tip-chip")).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId("cif-tip-chip")).toHaveCount(0);
  });

  test("reduced motion: the chip appears without animation classes", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1280, height: 800 });
    await seedTipReady(page);
    const chip = page.getByTestId("cif-tip-chip");
    await expect(chip).toBeVisible();
    const transition = await chip.evaluate(
      (el) => getComputedStyle(el).transitionDuration,
    );
    expect(transition).toBe("0s");
  });
});

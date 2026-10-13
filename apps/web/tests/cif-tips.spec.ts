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

interface SeedOptions {
  goal?: "world" | "story" | "campaign";
  goalInvitation?: "goal" | "explore";
  tipsEnabled?: boolean;
  optInAsked?: boolean;
  /** Leave the vault's front page ("Start your world") showing. */
  frontPage?: boolean;
}

/**
 * Seeds a vault whose guided setup has ended, with the given goal and tips
 * state, then reloads into the graph and waits for the vault to initialise,
 * which the tip depends on (under load that outlasts the default timeout, and
 * `status === "idle"` comes before it).
 */
async function seedSetupEnded(page: Page, opts: SeedOptions = {}) {
  const {
    goal = "world",
    goalInvitation = "goal",
    tipsEnabled = true,
    optInAsked = true,
    frontPage = false,
  } = opts;
  await page.addInitScript(() =>
    localStorage.setItem("codex_help_assistant", "true"),
  );
  await setupVaultPage(page);
  const vaultId = await page.evaluate(
    () => (window as any).vault.activeVaultId as string,
  );
  const journeyId = {
    world: "worldbuilder",
    story: "writer",
    campaign: "rpg-gm",
  }[goal];
  await page.evaluate(
    ({ id, latest, journeyId, goal, tipsEnabled, optInAsked, frontPage }) => {
      localStorage.setItem(
        `codex-onboarding-journey:${id}`,
        JSON.stringify({
          schema: 1,
          journeyId,
          journeyVersion: 1,
          startedAt: Date.now(),
          completed: [],
          skipped: [],
          viewing: null,
          outcome: "exited",
        }),
      );
      localStorage.setItem("codex_last_seen_version", latest);
      localStorage.setItem("codex_chosen_goal", goal);
      if (!frontPage) {
        localStorage.setItem(
          "codex_world_page_dismissed_at",
          String(Date.now()),
        );
      }
      try {
        localStorage.setItem(
          "codex-cif-tips",
          JSON.stringify({
            schema: 1,
            enabled: tipsEnabled,
            optInAsked,
            dismissed: [],
            acted: [],
            dismissCounts: {},
            silencedAreas: [],
          }),
        );
      } catch {
        // Scenario 10 blocks this key on purpose.
      }
      sessionStorage.clear();
    },
    {
      id: vaultId,
      latest: LATEST_RELEASE,
      journeyId,
      goal,
      tipsEnabled,
      optInAsked,
      frontPage,
    },
  );
  // setupVaultPage's init script re-marks the invitation dismissed on every
  // load; this one runs after it.
  await page.addInitScript(
    (answer) => localStorage.setItem("codex_goal_invitation", answer),
    goalInvitation,
  );
  await page.reload();
  await waitForVaultInitialised(page);
}

async function waitForVaultInitialised(page: Page) {
  await page.waitForFunction(
    () => (window as any).vault?.isInitialized === true,
    undefined,
    { timeout: 30000 },
  );
}

const CONTROLS =
  'button, a[href], input, select, textarea, [role="button"], [role="tab"]';

/** Visible buttons, links and fields the chip's box overlaps (Story 3, scenario 5). */
async function controlsUnderChip(page: Page): Promise<string[]> {
  return page.evaluate((selector) => {
    const chip = document.querySelector('[data-testid="cif-tip-chip"]');
    if (!chip) return ["no chip"];
    const c = chip.getBoundingClientRect();
    // The debug console renders only in dev and staging builds, never in production.
    const isDevOverlay = (el: HTMLElement) =>
      /^(Debug Log|Close Debug)/.test((el.textContent ?? "").trim());
    const isShown = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && style.visibility !== "hidden";
    };
    const overlapsChip = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return (
        r.left < c.right &&
        r.right > c.left &&
        r.top < c.bottom &&
        r.bottom > c.top
      );
    };
    const name = (el: HTMLElement) =>
      el.getAttribute("data-testid") ??
      el.getAttribute("aria-label") ??
      (el.textContent ?? "").trim().slice(0, 24);
    return [...document.querySelectorAll<HTMLElement>(selector)]
      .filter((el) => !chip.contains(el) && !isDevOverlay(el))
      .filter((el) => isShown(el) && overlapsChip(el))
      .map((el) => `${el.tagName}[${name(el)}]`);
  }, CONTROLS);
}

test.describe("Cif tip chip placement (spec 176, plan D7)", () => {
  for (const [name, size] of [
    ["phone", { width: 375, height: 812 }],
    // Tall enough that the bottom of the activity rail, and the Cif button, is on screen.
    ["desktop", { width: 1280, height: 1100 }],
  ] as const) {
    test(`chip sits beside the Cif button and covers no control on ${name}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(size);
      await seedSetupEnded(page);

      // The graph's floating buttons (below the lg breakpoint) render late;
      // measure once they are up.
      if (size.width < 1024) {
        await expect(page.getByTestId("graph-fab-create")).toBeVisible();
      }
      const chip = page.getByTestId("cif-tip-chip");
      await expect(chip).toBeVisible();
      const button = page.getByTestId("help-assistant-button");
      await expect(button).toBeInViewport();

      const chipBox = (await chip.boundingBox())!;
      const buttonBox = (await button.boundingBox())!;
      if (size.width >= 768) {
        // Beside the button, to its right.
        const gap = chipBox.x - (buttonBox.x + buttonBox.width);
        expect(gap).toBeGreaterThanOrEqual(0);
        expect(gap).toBeLessThan(40);
      } else {
        // Above the button, in its column; it may rise past the graph's buttons.
        expect(chipBox.y + chipBox.height).toBeLessThanOrEqual(buttonBox.y);
        const rightEdges = Math.abs(
          chipBox.x + chipBox.width - (buttonBox.x + buttonBox.width),
        );
        expect(rightEdges).toBeLessThan(24);
      }
      expect(chipBox.x).toBeGreaterThanOrEqual(0);
      expect(chipBox.x + chipBox.width).toBeLessThanOrEqual(size.width);
      expect(await controlsUnderChip(page)).toEqual([]);

      await page.screenshot({
        path: testInfo.outputPath(`cif-tip-${name}.png`),
      });
    });
  }

  test("uses the corner, clear of the footer, when the Cif button is cut off", async ({
    page,
  }, testInfo) => {
    // At 800px the bottom of the activity rail, with the Cif button, is clipped.
    await page.setViewportSize({ width: 1280, height: 800 });
    await seedSetupEnded(page);

    const chip = page.getByTestId("cif-tip-chip");
    await expect(chip).toBeVisible();
    await expect(
      page.getByTestId("help-assistant-button"),
    ).not.toBeInViewport();

    const chipBox = (await chip.boundingBox())!;
    const footerBox = (await page.locator("footer").first().boundingBox())!;
    expect(chipBox.y + chipBox.height).toBeLessThanOrEqual(footerBox.y);
    expect(chipBox.x + chipBox.width).toBeLessThanOrEqual(1280);
    expect(await controlsUnderChip(page)).toEqual([]);

    await page.screenshot({
      path: testInfo.outputPath("cif-tip-desktop-short.png"),
    });
  });
});

test.describe("Cif tips quickstart walkthrough (spec 176, T049)", () => {
  test("no tip over the front page; it appears after entering the world", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await seedSetupEnded(page, { frontPage: true });
    const enter = page.getByTestId("enter-world-button");
    await expect(enter).toBeVisible();
    await expect(page.getByTestId("cif-tip-chip")).toHaveCount(0);
    await enter.click();
    await expect(page.getByTestId("cif-tip-chip")).toBeVisible();
  });

  test("scenario 2: the one-time question turns tips on and is not asked again", async ({
    page,
  }) => {
    await seedSetupEnded(page, { tipsEnabled: false, optInAsked: false });
    const card = page.getByRole("region", {
      name: "Want occasional tips from Cif?",
    });
    await expect(card).toBeVisible();
    await page.getByTestId("tips-opt-in-yes").click();
    await expect(card).toHaveCount(0);
    await expect(page.getByTestId("cif-tip-chip")).toBeVisible();

    await page.reload();
    await waitForVaultInitialised(page);
    await expect(page.getByTestId("tips-opt-in")).toHaveCount(0);
    await page.getByTestId("settings-button").click();
    await page.getByRole("tab", { name: /^AI$/i }).click();
    await expect(
      page.getByRole("checkbox", { name: /Show tips from Cif/ }),
    ).toBeChecked();
  });

  test("scenario 2: answering No leaves tips off and is not asked again", async ({
    page,
  }) => {
    await seedSetupEnded(page, { tipsEnabled: false, optInAsked: false });
    await page.getByTestId("tips-opt-in-no").click();
    await expect(page.getByTestId("tips-opt-in")).toHaveCount(0);
    await expect(page.getByTestId("cif-tip-chip")).toHaveCount(0);
    await page.reload();
    await waitForVaultInitialised(page);
    await expect(page.getByTestId("tips-opt-in")).toHaveCount(0);
  });

  test("scenario 3: showing a tip sends nothing; tapping it asks Cif once", async ({
    page,
  }) => {
    const asks: string[] = [];
    await page.route("**/api/help/ask", async (route) => {
      asks.push(route.request().postData() ?? "");
      // Fail the answer so Cif shows its static fallback, with no AI involved.
      await route.fulfill({ status: 503, body: "{}" });
    });
    await seedSetupEnded(page);
    const chip = page.getByTestId("cif-tip-chip");
    await expect(chip).toBeVisible();
    expect(asks).toEqual([]);

    await page.getByTestId("cif-tip-act").click();
    await expect(page.getByTestId("help-assistant-panel")).toBeVisible();
    await expect.poll(() => asks.length).toBe(1);
    expect(asks[0]).toContain(
      "How do I explore how my entries relate on the graph?",
    );
    await expect(chip).toHaveCount(0);
  });

  test("scenario 4: one tip per visit; a new visit may show another", async ({
    page,
  }) => {
    // The writer goal has tips on the graph and on tables.
    await seedSetupEnded(page, { goal: "story" });
    await expect(page.getByTestId("cif-tip-chip")).toBeVisible();
    await page.getByTestId("cif-tip-dismiss").click();

    await page.goto("/tables");
    await waitForVaultInitialised(page);
    await expect(page.getByTestId("cif-tip-chip")).toHaveCount(0);

    // A new visit: the per-visit marker is gone.
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await waitForVaultInitialised(page);
    await expect(page.getByTestId("cif-tip-chip")).toContainText(
      "Roll on a random table",
    );
  });

  test("scenario 6: a dismissed tip stays gone after a reload", async ({
    page,
  }) => {
    await seedSetupEnded(page);
    await expect(page.getByTestId("cif-tip-chip")).toBeVisible();
    await page.getByTestId("cif-tip-dismiss").click();
    await expect(page.getByTestId("cif-tip-chip")).toHaveCount(0);
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await waitForVaultInitialised(page);
    await expect(page.getByTestId("cif-tip-chip")).toHaveCount(0);
  });

  test("scenario 9: reduced motion shows the chip without animation", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedSetupEnded(page);
    const chip = page.getByTestId("cif-tip-chip");
    await expect(chip).toBeVisible();
    expect(
      await chip.evaluate((el) => getComputedStyle(el).transitionDuration),
    ).toBe("0s");
  });

  test("scenario 7: no goal-based tip after Explore on my own", async ({
    page,
  }) => {
    await seedSetupEnded(page, {
      goalInvitation: "explore",
      optInAsked: false,
    });
    await expect(page.getByTestId("tips-opt-in")).toHaveCount(0);
    await expect(page.getByTestId("cif-tip-chip")).toHaveCount(0);
  });

  test("scenario 9: announced politely once, no focus move, labelled for screen readers", async ({
    page,
  }) => {
    await seedSetupEnded(page);
    const chip = page.getByRole("group", { name: "Tip from Cif" });
    await expect(chip).toBeVisible();
    await expect(chip.locator('[aria-live="polite"]')).toHaveText(
      "Cif has a tip: See how your entries relate",
    );
    expect(
      await chip.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(false);
    await expect(
      chip.getByRole("button", { name: /See how your entries relate/ }),
    ).toBeVisible();
    await expect(
      chip.getByRole("button", { name: "Dismiss tip" }),
    ).toBeVisible();
  });

  test("scenario 10: blocked tip storage behaves as tips off and the app keeps working", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      for (const proto of [Storage.prototype]) {
        const get = proto.getItem;
        const set = proto.setItem;
        proto.getItem = function (key: string) {
          if (key.startsWith("codex-cif-tips")) throw new Error("blocked");
          return get.call(this, key);
        };
        proto.setItem = function (key: string, value: string) {
          if (key.startsWith("codex-cif-tips")) throw new Error("blocked");
          return set.call(this, key, value);
        };
      }
    });
    await seedSetupEnded(page);
    await expect(page.getByTestId("cif-tip-chip")).toHaveCount(0);
    await page.getByTestId("settings-button").click();
    await page.getByRole("tab", { name: /^AI$/i }).click();
    await expect(
      page.getByRole("checkbox", { name: /Show tips from Cif/ }),
    ).not.toBeChecked();
  });
});

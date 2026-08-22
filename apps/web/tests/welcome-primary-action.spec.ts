import { test, expect, type Page } from "@playwright/test";

/**
 * The welcome screen's primary action is the graph preview itself: the whole
 * card is a button that opens Quick Start. It had been clickable for a long
 * time without anything saying so, and the visible cue for it sat below the
 * desktop fold along with the rest of the actions.
 *
 * The welcome screen is an absolutely positioned overlay with its own scroll,
 * so "above the fold" means inside `.marketing-layer`, not inside the document.
 */

const cueIsInView = (page: Page) =>
  page.evaluate(() => {
    const layer = document.querySelector(".marketing-layer");
    const cue = document.querySelector('[data-testid="welcome-preview-cue"]');
    if (!layer || !cue) return null;
    const top = cue.getBoundingClientRect().top;
    return {
      top: Math.round(top),
      inView: top >= 0 && top < layer.clientHeight,
    };
  });

test.describe("Welcome primary action", () => {
  for (const [w, h] of [
    [390, 844],
    [1280, 900],
  ] as const) {
    test(`the call to action is visible without scrolling at ${w}x${h}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/");

      await expect(page.getByTestId("welcome-preview-button")).toBeVisible();
      expect(await cueIsInView(page)).toMatchObject({ inView: true });
    });
  }

  test("clicking the graph opens Quick Start", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");

    await page.getByTestId("welcome-preview-button").click();
    await expect(page.getByTestId("quick-start-modal")).toBeVisible({
      timeout: 10000,
    });
  });

  test("the cue is not a nested interactive control", async ({ page }) => {
    await page.goto("/");
    // The card is a <button>; a real button inside it would be a
    // nested-interactive violation, which axe fails the workspace scan on.
    const tag = await page
      .getByTestId("welcome-preview-cue")
      .evaluate((el) => el.tagName);
    expect(tag).toBe("SPAN");
  });
});

test.describe("Welcome first click", () => {
  test("reports which control was used, once per visitor", async ({ page }) => {
    // Zaraz is not present in dev, so stand in for it and read what would
    // have been sent.
    await page.addInitScript(() => {
      (window as any).__events = [];
      (window as any).zaraz = {
        track: (name: string, props: unknown) =>
          (window as any).__events.push({ name, props }),
      };
    });

    await page.goto("/");
    await page.getByTestId("welcome-preview-button").click();

    await expect
      .poll(() => page.evaluate(() => (window as any).__events))
      .toEqual([
        { name: "welcome_first_click", props: { action: "graph_preview" } },
      ]);

    // The measure is the *first* choice, so a later visit must not overwrite it.
    await page.reload();
    expect(
      await page.evaluate(() =>
        localStorage.getItem("codex-cryptica-welcome-first-click"),
      ),
    ).toBe("graph_preview");
  });
});

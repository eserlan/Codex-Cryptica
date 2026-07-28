import { test, expect, type Page } from "@playwright/test";

/**
 * Phase 3 of #1791. Regression net for the class of bug that #1788's manual
 * QA pass caught and pure code review didn't: tooltip positioning/overflow,
 * and the tour/prune interaction — not just "does the selector exist"
 * (covered by the contract test, onboarding-selector-contract.test.ts) but
 * "does the tour actually render on-screen and behave correctly end-to-end."
 */

async function waitForVaultReady(page: Page) {
  await page.waitForFunction(
    () => {
      const v = (window as any).vault;
      return v && v.isInitialized && v.status === "idle";
    },
    { timeout: 60_000 },
  );
}

async function waitForTourActive(page: Page) {
  await page.waitForFunction(
    () => (window as any).helpStore?.activeTour != null,
    { timeout: 15_000 },
  );
}

/**
 * Asserts the tour tooltip currently shows the given step title. Scoped to
 * the tooltip testid rather than a page-wide getByText — several step
 * titles ("Create your first character") are also the text of the real UI
 * element the step targets (the graph empty-state's own CTA button), so an
 * unscoped text match is ambiguous.
 */
async function expectTourStepTitle(page: Page, title: string | RegExp) {
  await expect(page.getByTestId("tour-tooltip").getByText(title)).toBeVisible();
}

/**
 * Asserts the tour tooltip is fully on-screen — the exact bug class fixed in
 * GuideTooltip.svelte (a fixed size guess under-reserving space, and a clamp
 * that didn't account for the position's own transform).
 *
 * Polls rather than taking a single bounding-box reading: the tooltip has a
 * 300ms `fly` entrance transition, and GuideTooltip re-measures its own real
 * size via requestAnimationFrame on each step change — both mean the box
 * briefly reports a transient, not-yet-settled position right after a step
 * transition. Polling waits for that to converge instead of racing it.
 */
async function assertTooltipWithinViewport(page: Page) {
  const tooltip = page.getByTestId("tour-tooltip");
  await expect(tooltip).toBeVisible();
  const viewport = page.viewportSize();
  expect(viewport, "page should report a viewport size").not.toBeNull();
  const tolerance = 1; // sub-pixel rounding

  // Poll a single "how far past the viewport edge is it" number down to <= 0
  // (within tolerance), rather than a one-shot boundingBox() read that can
  // race the transition/remeasurement above.
  await expect
    .poll(
      async () => {
        const box = await tooltip.boundingBox();
        if (!box) return Infinity;
        return Math.max(
          -tolerance - box.x,
          -tolerance - box.y,
          box.x + box.width - (viewport!.width + tolerance),
          box.y + box.height - (viewport!.height + tolerance),
        );
      },
      { timeout: 1000 },
    )
    .toBeLessThanOrEqual(0);
}

test.describe("First-run onboarding tour — walkthrough", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
      // Deliberately do NOT mark initial-onboarding as seen, and don't
      // create any entities — the orchestrator should start the tour on its
      // own in this empty, un-onboarded vault.
    });
  });

  test("desktop: walks all 4 steps, tooltip stays on-screen at each, and completion is recorded", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForVaultReady(page);
    await waitForTourActive(page);

    // Step 1: welcome (target "body" — centered, no spotlight)
    await expectTourStepTitle(page, "Welcome — this is your world");
    await assertTooltipWithinViewport(page);
    await page.getByRole("button", { name: "Go to next step" }).click();

    // Step 2: create-entity (target the graph's empty-state CTA)
    await expectTourStepTitle(page, "Create your first character");
    await assertTooltipWithinViewport(page);
    await expect(page.getByTestId("tour-spotlight")).toBeVisible();
    await page.getByRole("button", { name: "Go to next step" }).click();

    // Step 3: graph (target the ActivityBar's graph icon)
    await expectTourStepTitle(page, "Watch it connect");
    await assertTooltipWithinViewport(page);
    await page.getByRole("button", { name: "Go to next step" }).click();

    // Step 4: oracle (target the ActivityBar's oracle icon) — last step
    await expectTourStepTitle(page, /Optional AI help/);
    await assertTooltipWithinViewport(page);
    await page.getByRole("button", { name: "Finish tour" }).click();

    await page.waitForFunction(
      () => (window as any).helpStore?.activeTour == null,
    );
    const hasSeen = await page.evaluate(() =>
      (window as any).helpStore.hasSeen("initial-onboarding"),
    );
    expect(hasSeen).toBe(true);
  });

  test("mobile viewport: tooltip stays fully on-screen at every step (regression for the bottom-bar overflow bug)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await waitForVaultReady(page);
    await waitForTourActive(page);

    await expectTourStepTitle(page, "Welcome — this is your world");
    await assertTooltipWithinViewport(page);
    await page.getByRole("button", { name: "Go to next step" }).click();

    await expectTourStepTitle(page, "Create your first character");
    await assertTooltipWithinViewport(page);
    await page.getByRole("button", { name: "Go to next step" }).click();

    // This is the exact step whose tooltip previously overflowed the bottom
    // of a mobile viewport (the ActivityBar's graph icon sits in a bottom
    // bar on mobile, not a desktop side rail).
    await expectTourStepTitle(page, "Watch it connect");
    await assertTooltipWithinViewport(page);
    await page.getByRole("button", { name: "Go to next step" }).click();

    await expectTourStepTitle(page, /Optional AI help/);
    await assertTooltipWithinViewport(page);
    await page.getByRole("button", { name: "Finish tour" }).click();
  });
});

test.describe("First-run onboarding tour — demo-to-build chain", () => {
  test("converting a demo vault skips the create-entity step (it already has entities)", async ({
    page,
  }) => {
    // No codex_skip_landing here — we need the real welcome/marketing layer
    // to reach the demo CTA.
    await page.goto("/");

    await page.getByTestId("welcome-demo-button").click();
    await page.waitForFunction(
      () => ((window as any).vault?.allEntities?.length ?? 0) > 0,
      { timeout: 30_000 },
    );

    await page.getByTestId("save-as-campaign-button").click();
    await waitForTourActive(page);

    await expectTourStepTitle(page, "Welcome — this is your world");
    await page.getByRole("button", { name: "Go to next step" }).click();

    // The converted vault already has entities, so pruneStepsToDom removes
    // the "create-entity" step (its target, the empty graph's CTA, doesn't
    // exist) — the tour should jump straight to "Watch it connect".
    await expectTourStepTitle(page, "Watch it connect");
    await expect(
      page.getByTestId("tour-tooltip").getByText("Create your first character"),
    ).not.toBeVisible();
  });
});

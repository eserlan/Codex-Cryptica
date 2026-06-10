import { test, expect } from "@playwright/test";
import {
  seedOnboardingComplete,
  waitForVaultReady,
  dismissFrontPage,
} from "./test-helpers";

/**
 * E2E tests for mobile first-time UX (#1291 and sub-issues #1295–#1298).
 *
 * Coverage:
 *  - #1297 Empty-vault "Start your world" card visible; dismissed when vault has entities
 *  - #1297 Cover image editor still accessible via "Change Image" even when vault is empty
 *  - #1298 Sticky "Enter your world" footer dismisses the front-page overlay on mobile
 *  - #1295 Coach marks appear on first mobile graph visit and dismiss persistently
 *  - #1296 Demo graph initial zoom readable on mobile (nodes not tiny dots)
 */

const MOBILE_VIEWPORT = { width: 390, height: 844 };

/** Boot the app, wait for vault idle, then surface the front page for testing. */
async function setupMobileFrontPage(
  page: Parameters<typeof dismissFrontPage>[0],
) {
  await page.goto("/");
  await waitForVaultReady(page);
  // First dismiss so graph-canvas renders (vault.isInitialized becomes true)
  await dismissFrontPage(page);
  await expect(page.getByTestId("graph-canvas")).toBeVisible({
    timeout: 10000,
  });
  // Now re-surface the front page overlay for testing
  await page.evaluate(() => {
    const ui = (window as any).uiStore;
    if (ui) {
      ui.dismissedWorldPage = false;
      ui.skipWelcomeScreen = true;
    }
    const onboarding = (window as any).onboardingStore;
    if (onboarding) {
      onboarding.dismissedWorldPage = false;
      onboarding.skipWelcomeScreen = true;
    }
  });
}

// ---------------------------------------------------------------------------
// #1297 — Empty vault "Start your world" card
// ---------------------------------------------------------------------------
test.describe("Empty vault start card (#1297)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.addInitScript(seedOnboardingComplete);
    await setupMobileFrontPage(page);
  });

  test("shows start-your-world card when vault is empty", async ({ page }) => {
    const overlay = page.getByTestId("front-page-overlay");
    await expect(overlay).toBeVisible({ timeout: 10000 });

    const card = page.getByTestId("start-your-world-card");
    await expect(card).toBeVisible({ timeout: 5000 });
    await expect(card.getByText("Start your world")).toBeVisible();
  });

  test("does not show start-your-world card when vault has entities", async ({
    page,
  }) => {
    // Seed one entity so vault is non-empty
    await page.evaluate(async () => {
      const vault = (window as any).vault;
      vault.isInitialized = true;
      vault.rootHandle = {};
      await vault.createEntity("npc", "Existing Entity", {
        content: "Some content",
      });
    });

    const overlay = page.getByTestId("front-page-overlay");
    await expect(overlay).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("start-your-world-card")).not.toBeVisible();
  });

  test("cover image editor opens from empty vault when cover exists", async ({
    page,
  }) => {
    // Seed a fake cover image path so the "Change Image" button appears
    await page.evaluate(() => {
      const ws = (window as any).worldStore;
      if (ws?.metadata) ws.metadata.coverImage = "test-cover.webp";
    });

    const overlay = page.getByTestId("front-page-overlay");
    await expect(overlay).toBeVisible({ timeout: 10000 });

    // "Change Image" button should be visible
    const changeBtn = page.getByRole("button", { name: "Change Image" });
    await expect(changeBtn).toBeVisible({ timeout: 5000 });
    await changeBtn.click();

    // Cover image panel should open — the isEmpty=true guard must NOT block it
    await expect(page.getByTestId("cover-image-panel")).toBeVisible({
      timeout: 5000,
    });
  });
});

// ---------------------------------------------------------------------------
// #1298 — Sticky "Enter your world" footer dismisses overlay on mobile
// ---------------------------------------------------------------------------
test.describe("Enter your world footer (#1298)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.addInitScript(seedOnboardingComplete);
    await setupMobileFrontPage(page);
  });

  test("sticky footer is visible on mobile when front page is open", async ({
    page,
  }) => {
    const overlay = page.getByTestId("front-page-overlay");
    await expect(overlay).toBeVisible({ timeout: 10000 });

    const footer = page.getByTestId("enter-world-button");
    await expect(footer).toBeVisible({ timeout: 5000 });
    await expect(footer).toContainText("Enter your world");
  });

  test("tapping Enter your world dismisses the overlay", async ({ page }) => {
    const overlay = page.getByTestId("front-page-overlay");
    await expect(overlay).toBeVisible({ timeout: 10000 });

    await page.getByTestId("enter-world-button").click();

    await expect(overlay).not.toBeVisible({ timeout: 5000 });
  });

  test("Enter your world footer is not visible on desktop", async ({
    page,
  }) => {
    // Switch to desktop viewport and reload
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.reload();
    await waitForVaultReady(page);
    await dismissFrontPage(page);
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 10000,
    });
    // Re-surface front page at desktop width
    await page.evaluate(() => {
      const ui = (window as any).uiStore;
      if (ui) {
        ui.dismissedWorldPage = false;
        ui.skipWelcomeScreen = true;
      }
      const onboarding = (window as any).onboardingStore;
      if (onboarding) {
        onboarding.dismissedWorldPage = false;
        onboarding.skipWelcomeScreen = true;
      }
    });

    const overlay = page.getByTestId("front-page-overlay");
    await expect(overlay).toBeVisible({ timeout: 10000 });

    // The button is md:hidden — it must not be visible at desktop width
    const footer = page.getByTestId("enter-world-button");
    await expect(footer).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// #1295 — Mobile graph coach marks
// ---------------------------------------------------------------------------
test.describe("Graph coach marks (#1295)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.addInitScript(() => {
      try {
        localStorage.setItem("codex_skip_landing", "true");
        localStorage.setItem(
          "codex-cryptica-help-state",
          JSON.stringify({ completedTours: ["initial-onboarding"] }),
        );
        // Clear coach marks only on first load (not on reload, so persistence is testable)
        if (!sessionStorage.getItem("_coach_marks_test_initialized")) {
          sessionStorage.setItem("_coach_marks_test_initialized", "1");
          localStorage.removeItem("codex_mobile_graph_coach_marks_seen");
        }
      } catch {
        /* ignore */
      }
    });
    await page.goto("/");
    await waitForVaultReady(page);
    // Dismiss front page so we land on the graph
    await dismissFrontPage(page);
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 10000,
    });
    // Ensure uiStore knows it's mobile
    await page.waitForFunction(
      () => (window as any).uiStore?.isMobile === true,
      { timeout: 5000 },
    );
  });

  test("coach marks appear on first mobile graph visit", async ({ page }) => {
    await expect(page.getByTestId("mobile-coach-mark")).toBeVisible({
      timeout: 10000,
    });
  });

  test("Next steps through all 3 coach marks and dismisses", async ({
    page,
  }) => {
    const mark = page.getByTestId("mobile-coach-mark");
    await expect(mark).toBeVisible({ timeout: 10000 });

    // Step 1 → 2
    await page.getByTestId("coach-mark-next").click();
    await expect(mark).toBeVisible();

    // Step 2 → 3
    await page.getByTestId("coach-mark-next").click();
    await expect(mark).toBeVisible();

    // Step 3 → Got it (dismiss)
    await page.getByTestId("coach-mark-next").click();
    await expect(mark).not.toBeVisible({ timeout: 3000 });
  });

  test("Skip dismisses coach marks immediately", async ({ page }) => {
    await expect(page.getByTestId("mobile-coach-mark")).toBeVisible({
      timeout: 10000,
    });
    await page.getByTestId("coach-mark-skip").click();
    await expect(page.getByTestId("mobile-coach-mark")).not.toBeVisible({
      timeout: 3000,
    });
  });

  test("coach marks do not reappear after dismissal", async ({ page }) => {
    await expect(page.getByTestId("mobile-coach-mark")).toBeVisible({
      timeout: 10000,
    });
    await page.getByTestId("coach-mark-skip").click();
    await expect(page.getByTestId("mobile-coach-mark")).not.toBeVisible({
      timeout: 3000,
    });

    // Reload and confirm still dismissed
    await page.reload();
    await waitForVaultReady(page);
    await dismissFrontPage(page);
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 10000,
    });
    await page.waitForFunction(
      () => (window as any).uiStore?.isMobile === true,
      { timeout: 5000 },
    );
    await page.waitForTimeout(1000);
    await expect(page.getByTestId("mobile-coach-mark")).not.toBeVisible();
  });

  test("coach marks are not shown on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(1000);
    await expect(page.getByTestId("mobile-coach-mark")).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// #1296 — Demo graph initial zoom readable on mobile
// ---------------------------------------------------------------------------
test.describe("Demo graph zoom (#1296)", () => {
  test("demo vault graph has readable zoom on mobile (≥ 0.5)", async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.addInitScript(seedOnboardingComplete);
    await page.goto("/");

    await waitForVaultReady(page);
    await dismissFrontPage(page);
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 10000,
    });

    // Create several entities so the graph has enough nodes to trigger layout enforcement
    await page.evaluate(async () => {
      const vault = (window as any).vault;
      vault.isInitialized = true;
      vault.rootHandle = {};
      for (let i = 0; i < 5; i++) {
        await vault.createEntity("npc", `Entity ${i}`, { content: "Test" });
      }
    });

    // Wait for nodes to appear in cytoscape
    await page.waitForFunction(() => (window as any).cy?.nodes().length >= 5, {
      timeout: 15000,
    });

    const zoom = await page.evaluate(() => (window as any).cy?.zoom() ?? 0);
    expect(zoom).toBeGreaterThanOrEqual(0.5);
  });
});

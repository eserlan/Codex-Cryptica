import { test, expect } from "@playwright/test";

test.describe("Fix #804 Visual Verification", () => {
  test("Entity title should wrap on mobile and have correct height", async ({
    page,
  }) => {
    // Set viewport to mobile width
    await page.setViewportSize({ width: 360, height: 800 });

    // Mock init to skip onboarding and landing
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      try {
        localStorage.setItem("codex_skip_landing", "true");
        localStorage.setItem("codex_demo_mode", "true");
      } catch {
        /* ignore */
      }
    });

    await page.goto("/");

    // Wait for vault to be available
    await page.waitForFunction(() => (window as any).vault);

    const longTitle =
      "This is an extremely long entity title that must wrap on multiple lines to be readable on a small mobile device";

    // Create an entity with a long title and focus it
    await page.evaluate(async (title) => {
      const vault = (window as any).vault;
      vault.isInitialized = true;
      vault.rootHandle = {};
      const id = await vault.createEntity("npc", title, {
        content: "Verification content",
      });
      vault.selectedEntityId = id;
    }, longTitle);

    // Wait for the panel to be visible
    const panel = page.getByTestId("entity-detail-panel");
    await expect(panel).toBeVisible({ timeout: 10000 });

    // Locate the title h2 element. It should have the title text.
    const titleHeader = page.locator("h2").filter({ hasText: longTitle });
    await expect(titleHeader).toBeVisible();

    // Get bounding box
    const box = await titleHeader.boundingBox();
    console.log(`Title box: ${JSON.stringify(box)}`);

    if (box) {
      // On mobile (360px wide), this long title should definitely wrap.
      // A single line of text-xl (20px) with leading-tight/normal is ~28-30px.
      // If it wraps to 3+ lines, height should be > 60px.
      expect(box.height).toBeGreaterThan(50);
      console.log(
        `Verified: Title height is ${box.height}px, which confirms wrapping.`,
      );
    } else {
      throw new Error("Could not find bounding box for title");
    }

    // Take a screenshot for the user
    await page.screenshot({ path: "fix-804-mobile-verification.png" });
  });
});

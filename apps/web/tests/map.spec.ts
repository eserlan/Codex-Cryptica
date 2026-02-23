import { test, expect, type Page } from "@playwright/test";
import path from "path";

test.describe("Map Mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
    });

    // Start with a clean demo
    await page.goto("/?demo=fantasy");

    // Wait for vault initialization
    await page.waitForFunction(
      () => (window as any).vault?.isInitialized === true,
      { timeout: 20000 },
    );

    // Navigate to Map Mode via client-side routing to preserve the OPFS in-memory state
    await page.evaluate(() => {
      // Find any link to /map and click it to trigger SvelteKit's router
      const mapLink = document.querySelector('a[href$="/map"]') as HTMLElement;
      if (mapLink) {
        mapLink.click();
      }
    });
    // Wait for the URL to change
    await page.waitForTimeout(500); // Give router a moment
    await page.waitForURL("**/map", { timeout: 10000 });
  });

  test("should allow uploading a map image and rendering it", async ({
    page,
  }) => {
    // 1. Initial state check
    await expect(page.getByText("No active map")).toBeVisible({
      timeout: 15000,
    });

    // 2. Upload a test image
    const testImagePath = path.join(process.cwd(), "static/favicon.png");

    await page.click('button:has-text("Upload World Image")');
    // Use more specific selectors for the modal
    await page.fill('input[id="map-name"]', "E2E Test Map");

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.locator('input[type="file"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testImagePath);

    // Specifically target the Upload button in the modal
    await page.getByRole("button", { name: "Upload", exact: true }).click();

    // 3. Verify rendering
    // We wait for the "No active map" to disappear first
    await expect(page.getByText("No active map")).not.toBeVisible({
      timeout: 15000,
    });
    // Then check for the canvas
    await expect(page.locator("canvas")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("select")).toContainText("E2E Test Map");
  });

  test("should toggle Fog of War and GM Mode when a map is active", async ({
    page,
  }) => {
    await ensureTestMap(page);

    // 1. Verify HUD controls
    await expect(page.getByText("PLAYER VIEW")).toBeVisible();
    await expect(page.getByText("FOG: ON")).toBeVisible();

    // 2. Toggle GM Mode
    await page.waitForSelector('button:has-text("PLAYER VIEW")');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("PLAYER VIEW"),
      );
      if (btn) btn.click();
    });
    await expect(page.getByText("GM MODE: ON")).toBeVisible();
    await expect(page.getByText("Brush Size")).toBeVisible();

    // 3. Toggle Fog
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("FOG: ON"),
      );
      if (btn) btn.click();
    });
    await expect(page.getByText("FOG: OFF")).toBeVisible();
  });
});

async function ensureTestMap(page: Page) {
  const noMapText = page.getByText("No active map");
  if (await noMapText.isVisible()) {
    const testImagePath = path.join(process.cwd(), "static/favicon.png");
    await page.click('button:has-text("Upload World Image")');
    await page.fill('input[id="map-name"]', "Fallback Map");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.locator('input[type="file"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testImagePath);
    await page.getByRole("button", { name: "Upload", exact: true }).click();
  }
  await expect(page.locator("canvas")).toBeVisible({ timeout: 20000 });
}

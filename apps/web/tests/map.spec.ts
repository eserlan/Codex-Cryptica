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
    // Check for error boundary first
    const errorOverlay = page.locator(".z-\\[1000\\]");
    if (await errorOverlay.isVisible({ timeout: 2000 }).catch(() => false)) {
      throw new Error(
        "\n\nRED BOX ERROR IN TEST 1: " +
          (await errorOverlay.innerText()) +
          "\n\n",
      );
    }

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

  test("should allow deleting a map via Zen Mode", async ({ page }) => {
    await ensureTestMap(page);

    // Navigate to the overview map first to ensure an entity can be selected
    await page.goto("/?demo=fantasy");
    await page.waitForFunction(
      () => (window as any).vault?.isInitialized === true,
      { timeout: 20000 },
    );
    // Select the first available entity and open Zen Mode programmatically
    await page.evaluate(() => {
      const entityId = Object.keys((window as any).vault.entities)[0];
      (window as any).uiStore.openZenMode(entityId);
    });

    // Verify Zen Mode is open
    await expect(page.locator("#tab-map")).toBeVisible({ timeout: 5000 });

    // Click the Map Tab
    await page.click("#tab-map");

    // Confirm that the map is empty initially for this character
    const uploadLabel = page.getByText("Upload Map", { exact: true });
    await expect(uploadLabel).toBeVisible({ timeout: 5000 });

    // Upload a test image as a sub-map
    const testImagePath = path.join(process.cwd(), "static/favicon.png");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await uploadLabel.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testImagePath);

    // Verify the map was uploaded and the delete button is visible
    const deleteBtn = page.getByRole("button", { name: "DELETE", exact: true });
    await expect(deleteBtn).toBeVisible({ timeout: 15000 });

    // Click delete and handle the confirm dialog
    page.once("dialog", (dialog) => dialog.accept());
    await deleteBtn.click();

    // Verify the map was deleted and the upload button is back
    await expect(uploadLabel).toBeVisible({ timeout: 15000 });
  });
});

async function ensureTestMap(page: Page) {
  // Check for the error boundary overlay
  const errorOverlay = page.locator(".z-\\[1000\\]");
  if (await errorOverlay.isVisible({ timeout: 1000 }).catch(() => false)) {
    throw new Error(
      "\n\nRED BOX DETECTED IN ensureTestMap: " +
        (await errorOverlay.innerText()) +
        "\n\n",
    );
  }

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

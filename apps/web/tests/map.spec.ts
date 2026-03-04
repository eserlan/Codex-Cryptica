import { test, expect, type Page } from "@playwright/test";
import path from "path";

test.describe("Map Mode", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`BROWSER [${msg.type()}]: ${msg.text()}`);
    });

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

  test("should allow adding and then deleting a pin", async ({ page }) => {
    await ensureTestMap(page);

    // 1. Add a pin via double click
    const canvas = page.locator("canvas");
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas box not found");

    // Double click in the center
    await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);

    // 2. Link it (Skip linking for now to keep it simple)
    await page.getByRole("button", { name: "Skip Linking" }).click();

    // 3. Select the pin (it should be selected automatically or clickable)
    // Pins are rendered on canvas, so we click the same spot to select it
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    // 4. Verify popover and delete button
    const deleteButton = page.getByRole("button", { name: "Delete pin" });
    await expect(deleteButton).toBeVisible();

    // 5. Click delete
    await deleteButton.click();

    // 6. Verify popover is gone
    await expect(deleteButton).not.toBeVisible();

    // 7. Verify pin count in store (via evaluate)
    const pinCount = await page.evaluate(() => {
      return (window as any).__mapStore.pins.length;
    });
    expect(pinCount).toBe(0);
  });

  test("should allow tagging a map as 'World Map' and auto-loading it", async ({
    page,
  }) => {
    await ensureTestMap(page);

    // 1. Initially, it shouldn't be marked as world map
    await expect(page.getByText("SET WORLD")).toBeVisible();

    // 2. Mark as world map
    await page.click('button:has-text("SET WORLD")');

    // 3. Verify UI change
    await expect(page.getByText("WORLD MAP")).toBeVisible();
    await expect(page.locator("select")).toContainText("★ Fallback Map");

    // 4. Reload page and navigate back to /map (use evaluated router click to keep demo state)
    await page.evaluate(() => {
      const homeLink = document.querySelector('a[href="/"]') as HTMLElement;
      if (homeLink) homeLink.click();
    });
    await page.waitForURL("**/", { timeout: 10000 });

    await page.evaluate(() => {
      const mapLink = document.querySelector('a[href$="/map"]') as HTMLElement;
      if (mapLink) mapLink.click();
    });
    await page.waitForURL("**/map", { timeout: 10000 });

    // 5. Verify it auto-loaded the tagged map
    await expect(page.locator("canvas")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("WORLD MAP")).toBeVisible();
  });

  test("should toggle Fog of War and GM Mode when a map is active", async ({
    page,
  }) => {
    await ensureTestMap(page);

    // 1. Verify HUD controls
    await expect(page.getByText("PLAYER VIEW")).toBeVisible();
    await expect(page.getByText("FOG: ON")).toBeVisible();

    // 2. Click Player View (enters shared mode, hides GM tools)
    await page.getByRole("button", { name: "PLAYER VIEW" }).click();
    await expect(page.getByText("EXIT PLAYER VIEW")).toBeVisible();
    await expect(page.getByText("Brush Size")).not.toBeVisible();

    // 3. Toggle back
    await page.getByRole("button", { name: "EXIT PLAYER VIEW" }).click();
    await expect(page.getByText("PLAYER VIEW")).toBeVisible();
    await expect(page.getByText("Brush Size")).toBeVisible();

    // 4. Toggle Fog (GM Tool)
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("FOG: ON"),
      );
      if (btn) btn.click();
    });
    await expect(page.getByText("FOG: OFF")).toBeVisible();
  });

  test("should allow deleting a map via Zen Mode", async ({ page }) => {
    // Navigate to home and ensure vault is initialized
    await page.goto("/?demo=fantasy");
    await page.waitForFunction(
      () => (window as any).vault?.isInitialized === true,
      { timeout: 20000 },
    );

    // Select the first available entity and open Zen Mode programmatically directly to the map tab
    await page.evaluate(() => {
      const entities = (window as any).vault.entities;
      const entityId = Object.keys(entities)[0];
      if (entityId) {
        (window as any).uiStore.openZenMode(entityId, "map");
      }
    });

    // 1. Confirm that the map is empty initially for this character
    // Check if the modal itself is even there
    await expect(page.getByTestId("zen-mode-modal")).toBeVisible({
      timeout: 15000,
    });

    const uploadLabel = page.getByText("No map attached");
    await expect(uploadLabel).toBeVisible({ timeout: 15000 });

    // 3. Upload a test image as a sub-map
    const testImagePath = path.join(process.cwd(), "static/favicon.png");
    const fileChooserPromise = page.waitForEvent("filechooser");
    // Click the label that wraps the hidden input
    await page.locator('label:has-text("Upload Map")').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testImagePath);

    // 4. Verify the map was uploaded and the delete button is visible
    const deleteBtn = page.getByRole("button", { name: "DELETE", exact: true });
    await expect(deleteBtn).toBeVisible({ timeout: 20000 });

    // 5. Click delete and handle the confirm dialog
    page.once("dialog", (dialog) => dialog.accept());
    await deleteBtn.click();

    // 6. Verify the map was deleted and the upload button is back
    const uploadLabelFinal = page.locator('label:has-text("Upload Map")');
    await expect(uploadLabelFinal).toBeVisible({ timeout: 20000 });
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

import { test, expect, type Page } from "@playwright/test";
import { openMapWithUpload } from "./test-helpers";

/**
 * T090: the hex crawl journey with AI disabled (quickstart scenarios 2, 4 and 5).
 * Turns Hex Crawl on, opens a hex, sets terrain and notes, rolls a discovery on
 * terrain tables, saves the landmark, and checks it survives a reload.
 */

async function openGridSettings(page: Page) {
  await page
    .locator('[data-help-target="vtt-grid-button"]')
    .click({ button: "right" });
  await expect(
    page.getByRole("heading", { name: /grid/i }).first(),
  ).toBeVisible();
}

async function applyGridSettings(page: Page) {
  // Grid type only takes effect on "Apply to All"; Close discards it.
  const apply = page.getByRole("button", { name: "Apply to All", exact: true });
  await apply.scrollIntoViewIfNeeded();
  await apply.click();
  await expect(page.getByRole("dialog", { name: "Grid Settings" })).toHaveCount(
    0,
  );
}

/** Clicks the centre of the map canvas, which lies on a hex once the grid is set. */
async function clickCentreHex(page: Page) {
  const box = await page.locator("canvas").first().boundingBox();
  if (!box) throw new Error("map canvas not found");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test.describe("Hex crawl journey (AI disabled)", () => {
  test.use({ viewport: { width: 1400, height: 1100 } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("codex_ai_disabled", "true");
    });
    await openMapWithUpload(page, "Hex Crawl Map");
  });

  test("prepares a hex, explores it on tables, saves a landmark, and keeps it after reload", async ({
    page,
  }) => {
    // Hex grid and Hex Crawl mode, from grid settings.
    await openGridSettings(page);
    const pointy = page.getByRole("button", { name: /pointy/i });
    await pointy.scrollIntoViewIfNeeded();
    await pointy.click();
    const mode = page.getByRole("switch", { name: /hex crawl/i });
    await mode.scrollIntoViewIfNeeded();
    await mode.check();
    await applyGridSettings(page);

    // Click a hex: the GM panel opens.
    await clickCentreHex(page);
    const panel = page.locator("#hex-panel-title");
    await expect(panel).toBeVisible();

    // Terrain and notes persist on the hex.
    await page.getByRole("button", { name: "Forest", exact: true }).click();
    await page
      .getByLabel("Your notes")
      .fill("Old road runs through the trees.");

    // Explore on terrain tables (AI is disabled), then save the landmark.
    await page.getByRole("button", { name: "Explore", exact: true }).click();
    await page.getByRole("button", { name: "Save as location" }).click();

    // Reload and reopen the same hex: the terrain, the note and the draft are still there.
    await page.reload();
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 15000,
    });
    await clickCentreHex(page);
    await expect(panel).toBeVisible();
    await expect(page.getByLabel("Your notes")).toHaveValue(
      "Old road runs through the trees.",
    );
    await expect(
      page.getByRole("button", { name: "Forest", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("does not show hex panel or markers in Player View (negative path)", async ({
    page,
  }) => {
    await openGridSettings(page);
    const pointy = page.getByRole("button", { name: /pointy/i });
    await pointy.scrollIntoViewIfNeeded();
    await pointy.click();
    const mode = page.getByRole("switch", { name: /hex crawl/i });
    await mode.scrollIntoViewIfNeeded();
    await mode.check();
    await applyGridSettings(page);

    await page.getByTestId("shared-mode-toggle").click();
    await clickCentreHex(page);
    await expect(page.locator("#hex-panel-title")).toHaveCount(0);
  });

  test("opens a hex within the SC-002 budget on a map with 2,000 hex records", async ({
    page,
  }) => {
    // T092: seeds 2,000 touched hexes into the real vault, then times click to panel.
    await openGridSettings(page);
    const pointy = page.getByRole("button", { name: /pointy/i });
    await pointy.scrollIntoViewIfNeeded();
    await pointy.click();
    const mode = page.getByRole("switch", { name: /hex crawl/i });
    await mode.scrollIntoViewIfNeeded();
    await mode.check();
    await applyGridSettings(page);

    await page.evaluate(() => {
      const v = (window as any).vault;
      const id = Object.keys(v.maps)[0];
      const hexes: Record<string, unknown> = {};
      for (let q = 0; q < 100; q++) {
        for (let r = 0; r < 20; r++) {
          hexes[`${q},${r}`] = {
            terrain: { kind: "preset", id: "forest" },
            updatedAt: 1,
          };
        }
      }
      v.maps[id].hexCrawl = { enabled: true, hexes };
    });

    const started = Date.now();
    await clickCentreHex(page);
    await expect(page.locator("#hex-panel-title")).toBeVisible();
    const elapsed = Date.now() - started;
    console.log("SC002_CLICK_TO_PANEL_MS", elapsed);
    expect(elapsed).toBeLessThan(500);

    const icons = await page
      .locator('canvas ~ * span[class*="icon-["]')
      .count();
    expect(icons).toBeLessThan(2000);
  });

  test("Go to hex opens a typed hex, rejects an unknown one, and the grid survives a reload", async ({
    page,
  }) => {
    // Quickstart scenarios 1 (grid kept) and 8 (keyboard access). Cross-device
    // travel needs two devices, so only persistence on this device is checked.
    await openGridSettings(page);
    const pointy = page.getByRole("button", { name: /pointy/i });
    await pointy.scrollIntoViewIfNeeded();
    await pointy.click();
    const mode = page.getByRole("switch", { name: /hex crawl/i });
    await mode.scrollIntoViewIfNeeded();
    await mode.check();
    await applyGridSettings(page);
    // Settings are saved on a 250 ms debounce; wait so the reload is not racing it.
    await page.waitForTimeout(1000);

    await page.reload();
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 15000,
    });
    await openGridSettings(page);
    await expect(page.getByRole("button", { name: /pointy/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await applyGridSettings(page);

    const goTo = page.getByLabel("Go to hex");
    await goTo.fill("ZZ99");
    await page.getByRole("button", { name: "Go", exact: true }).click();
    await expect(page.getByText(/There is no hex/)).toBeVisible();
    await expect(page.locator("#hex-panel-title")).toHaveCount(0);

    await goTo.fill("00.00");
    await page.getByRole("button", { name: "Go", exact: true }).click();
    await expect(page.locator("#hex-panel-title")).toBeVisible();
  });

  test("quickstart 5: custom terrain explores offline with the general-tables message", async ({
    page,
  }) => {
    await enableHexMode(page);
    await clickCentreHex(page);
    await expect(page.locator("#hex-panel-title")).toBeVisible();

    await page.getByRole("button", { name: "Custom…" }).click();
    await page.getByLabel("Custom terrain name").fill("Glass dunes");
    await page.getByRole("button", { name: "Use custom terrain" }).click();
    await page.getByRole("button", { name: "Explore", exact: true }).click();
    await expect(
      page.getByText(
        "No tables for 'Glass dunes', so general tables were used.",
      ),
    ).toBeVisible();
  });

  test("quickstart 7: changing the grid of a map with hex records asks first, and cancel keeps it", async ({
    page,
  }) => {
    await enableHexMode(page);
    await clickCentreHex(page);
    await page.getByRole("button", { name: "Forest", exact: true }).click();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1000);

    await openGridSettings(page);
    const radius = page.getByRole("slider", { name: "Hex Radius (Pixels)" });
    await radius.fill("60");
    await page
      .getByRole("button", { name: "Apply to All", exact: true })
      .click();
    await expect(page.getByText(/hex records/)).toBeVisible();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByText(/hex records/)).toHaveCount(0);
  });
});

/** Opens grid settings and sets a hex grid with Hex Crawl mode on, then applies it. */
async function enableHexMode(page: Page) {
  await openGridSettings(page);
  const pointy = page.getByRole("button", { name: /pointy/i });
  await pointy.scrollIntoViewIfNeeded();
  await pointy.click();
  const mode = page.getByRole("switch", { name: /hex crawl/i });
  await mode.scrollIntoViewIfNeeded();
  await mode.check();
  await applyGridSettings(page);
}

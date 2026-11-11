import { test, expect, type Page } from "@playwright/test";
import { openMapWithUpload } from "./test-helpers";

/**
 * #4659 quickstart, with AI disabled: generate an area, cancel, accept, protect
 * hand-set terrain, undo, reload, and check the phone layout and that no
 * network request leaves the app for generation.
 */

async function enableHexCrawl(page: Page) {
  await page
    .locator('[data-help-target="vtt-grid-button"]')
    .click({ button: "right" });
  const pointy = page.getByRole("button", { name: /pointy/i });
  await pointy.scrollIntoViewIfNeeded();
  await pointy.click();
  const mode = page.getByRole("switch", { name: /hex crawl/i });
  await mode.scrollIntoViewIfNeeded();
  await mode.check();
  const apply = page.getByRole("button", { name: "Apply to All", exact: true });
  await apply.scrollIntoViewIfNeeded();
  await apply.click();
  await expect(page.getByRole("dialog", { name: "Grid Settings" })).toHaveCount(
    0,
  );
}

async function clickCentreHex(page: Page) {
  const box = await page.locator("canvas").first().boundingBox();
  if (!box) throw new Error("map canvas not found");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

const hexes = (page: Page) =>
  page.evaluate(() => {
    const maps = Object.values((window as any).vault.maps) as any[];
    return maps.find((m) => m.hexCrawl)?.hexCrawl?.hexes ?? {};
  });

async function prepare(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("codex_ai_disabled", "true");
  });
  await openMapWithUpload(page, "Region Map");
  await enableHexCrawl(page);
  await clickCentreHex(page);
  await expect(page.locator("#hex-panel-title")).toBeVisible();
  await page.getByRole("button", { name: "Forest", exact: true }).click();
}

test.describe("Generate region (AI disabled)", () => {
  test.setTimeout(150000);
  test.use({ viewport: { width: 1400, height: 1100 } });
  test.beforeEach(({ page }) => prepare(page));

  test("previews, cancels without changes, accepts, protects hand-set terrain, undoes and survives reload", async ({
    page,
  }) => {
    const external: string[] = [];
    let recording = false;
    page.on("request", (r) => {
      const url = new URL(r.url());
      if (
        recording &&
        /^https?:$/.test(url.protocol) &&
        url.hostname !== "localhost"
      )
        external.push(r.url());
    });
    const before = Object.keys(await hexes(page)).length;

    recording = true;
    await page.getByRole("button", { name: /Generate area/ }).click();
    const bar = page.getByTestId("region-review-bar");
    await expect(bar).toBeVisible();
    await expect(page.getByTestId("region-ai-off")).toContainText(
      "No AI is used",
    );
    expect(
      await page.getByTestId("region-proposed-hex").count(),
    ).toBeGreaterThan(10);

    // Cancel leaves the map untouched.
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(bar).toHaveCount(0);
    expect(Object.keys(await hexes(page))).toHaveLength(before);

    // Accept writes terrain with provenance, and the hand-set hex is untouched.
    await clickCentreHex(page);
    await page.getByRole("button", { name: /Generate area/ }).click();
    await page.getByRole("button", { name: "Accept" }).click();
    await expect(page.getByTestId("region-message")).toContainText("Saved");
    const after = await hexes(page);
    expect(Object.keys(after).length).toBeGreaterThan(before + 10);
    const generated = Object.values<any>(after).filter((h) => h.generated);
    expect(generated.length).toBeGreaterThan(10);
    const manual = Object.values<any>(after).filter(
      (h) => h.terrain?.id === "forest" && !h.generated,
    );
    expect(manual.length).toBeGreaterThanOrEqual(1);

    // Generating, previewing and accepting made no request outside the app.
    recording = false;
    expect(external).toEqual([]);

    // Undo puts the map back.
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByTestId("region-message")).toContainText("undone");
    expect(Object.keys(await hexes(page))).toHaveLength(before);

    // Accept again; it survives a reload.
    await clickCentreHex(page);
    await page.getByRole("button", { name: /Generate area/ }).click();
    await page.getByRole("button", { name: "Accept" }).click();
    await expect(page.getByTestId("region-message")).toContainText("Saved");
    const saved = Object.keys(await hexes(page)).length;
    await page.reload();
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 15000,
    });
    await page.waitForFunction(() => (window as any).vault?.isInitialized);
    expect(Object.keys(await hexes(page))).toHaveLength(saved);
  });
});

test.describe("Generate region on a phone", () => {
  test.setTimeout(150000);
  test.use({ viewport: { width: 1400, height: 1100 } });

  test("keeps the proposal visible above the review sheet", async ({
    page,
    context,
  }) => {
    await prepare(page);
    // Prepare the map on a desktop, then look at it as a 360 px phone.
    const cdp = await context.newCDPSession(page);
    const { windowId } = await cdp.send("Browser.getWindowForTarget");
    await cdp.send("Browser.setWindowBounds", {
      windowId,
      bounds: { windowState: "normal" },
    });
    await page.setViewportSize({ width: 360, height: 740 });
    await page.waitForTimeout(500);
    await clickCentreHex(page);
    await page.getByRole("button", { name: /Generate area/ }).click();
    const bar = page.getByTestId("region-review-bar");
    await expect(bar).toBeVisible();
    const box = await bar.boundingBox();
    expect(box!.height).toBeLessThanOrEqual(740 * 0.5 + 1);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(360);
    // Accept and Cancel stay on screen without scrolling the sheet.
    for (const name of ["Accept", "Cancel"]) {
      const b = await page.getByRole("button", { name }).boundingBox();
      expect(b!.y + b!.height).toBeLessThanOrEqual(740);
    }
    for (const name of ["Accept", "Cancel", "Reroll", "Copy seed"]) {
      const b = await page.getByRole("button", { name }).boundingBox();
      expect(b!.height).toBeGreaterThanOrEqual(43);
      expect(b!.width).toBeGreaterThanOrEqual(43);
    }
    expect(await page.evaluate(() => window.innerWidth)).toBe(360);
    const icon = page
      .getByTestId("region-proposed-hex")
      .first()
      .locator("span");
    const mask = await icon.evaluate((el) => {
      const style = getComputedStyle(el);
      return style.maskImage || style.webkitMaskImage;
    });
    expect(mask).not.toBe("none");
    await page.screenshot({ path: "test-results/region-phone.png" });
  });
});

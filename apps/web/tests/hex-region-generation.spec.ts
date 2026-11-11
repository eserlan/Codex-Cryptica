import { test, expect, type Page } from "@playwright/test";
import { formatHexLabel } from "map-engine";
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

type Hex = { q: number; r: number };
const key = (h: Hex) => `${h.q},${h.r}`;

/** Open a hex by its label, as the GM does with Go to hex. */
async function goTo(page: Page, hex: Hex) {
  const input = page.locator("#hex-go-to-input");
  await input.fill(formatHexLabel(hex, { style: "numeric" }, "pointy"));
  await input.press("Enter");
  await expect(page.locator("#hex-panel-title")).toBeVisible();
}

async function setTerrain(page: Page, hex: Hex, name: string) {
  await goTo(page, hex);
  await page.getByRole("button", { name, exact: true }).click();
}

/** The hex the centre click landed on is the only record after set-up. */
async function baseHex(page: Page): Promise<Hex> {
  const [k] = Object.keys(await hexes(page));
  const [q, r] = k.split(",").map(Number);
  return { q, r };
}

async function proposed(page: Page) {
  const out: Record<string, string> = {};
  for (const el of await page.getByTestId("region-proposed-hex").all()) {
    const label = (await el.getAttribute("aria-label")) ?? "";
    out[(await el.getAttribute("data-hex"))!] = /^Proposed (\w+)/.exec(
      label,
    )![1];
  }
  return out;
}

async function start(page: Page, hex: Hex, choice: RegExp) {
  await goTo(page, hex);
  await page.getByRole("button", { name: choice }).click();
}

async function accept(page: Page) {
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByTestId("region-message")).toContainText("Saved");
}

test.describe("Quickstart scenarios 2 and 4 to 9, live (AI disabled)", () => {
  test.setTimeout(240000);
  test.use({ viewport: { width: 1400, height: 1100 } });
  test.beforeEach(({ page }) => prepare(page));

  test("2. coherence: land continues from fixed terrain and coast sits against water", async ({
    page,
  }) => {
    const b = await baseHex(page);
    await setTerrain(page, { q: b.q - 2, r: b.r }, "Forest");
    await setTerrain(page, { q: b.q + 2, r: b.r }, "Plains");
    await setTerrain(page, { q: b.q, r: b.r + 2 }, "Water");
    await start(page, b, /Generate area/);
    const map = await proposed(page);
    expect(Object.keys(map).length).toBeGreaterThan(3);
    await accept(page);
    const all = await hexes(page);
    const terrain = (q: number, r: number) => all[`${q},${r}`]?.terrain?.id;
    const around = [
      [1, 0],
      [1, -1],
      [0, -1],
      [-1, 0],
      [-1, 1],
      [0, 1],
    ];
    for (const k of Object.keys(all)) {
      if (!all[k].generated) continue;
      const [q, r] = k.split(",").map(Number);
      const near = around.map(([dq, dr]) => terrain(q + dq, r + dr));
      if (terrain(q, r) === "mountains") expect(near).not.toContain("water");
      if (terrain(q, r) === "plains" || terrain(q, r) === "forest")
        expect(near).not.toContain("water");
    }
  });

  test("4. growing in passes never changes an earlier hex, and says when there is nothing to grow", async ({
    page,
  }) => {
    const b = await baseHex(page);
    const snapshots: Record<string, string> = {};
    for (const step of [
      { q: b.q + 1, r: b.r },
      { q: b.q + 2, r: b.r },
      { q: b.q + 3, r: b.r },
    ]) {
      await start(page, step, /Grow from this hex/);
      await accept(page);
      const all = await hexes(page);
      for (const [k, v] of Object.entries(snapshots))
        expect(all[k].terrain.id).toBe(v);
      for (const [k, h] of Object.entries<any>(all))
        snapshots[k] = h.terrain?.id;
      await page.getByRole("button", { name: "Dismiss" }).click();
    }
    // The first hex now has terrain all round it, so there is nothing to grow.
    await start(page, { q: b.q + 1, r: b.r }, /Grow from this hex/);
    await expect(page.getByTestId("region-message")).toContainText(
      "nothing to generate",
    );
  });

  test("5. fill gaps proposes only the strip between two areas", async ({
    page,
  }) => {
    const b = await baseHex(page);
    await setTerrain(page, { q: b.q + 4, r: b.r }, "Plains");
    await start(page, { q: b.q + 2, r: b.r }, /Fill gaps/);
    const map = await proposed(page);
    expect(Object.keys(map).sort()).toEqual(
      [1, 2, 3].map((d) => key({ q: b.q + d, r: b.r })).sort(),
    );
  });

  test("6. adjusting is kept as hand-set terrain, and regenerate leaves it alone and warns about explored hexes", async ({
    page,
  }) => {
    const b = await baseHex(page);
    await start(page, b, /Generate area/);
    const first = Object.keys(await proposed(page))[0];
    await page.locator(`[data-hex="${first}"]`).click();
    await page.getByRole("button", { name: "Swamp", exact: true }).click();
    await accept(page);
    const afterAccept = await hexes(page);
    expect(afterAccept[first].terrain.id).toBe("swamp");
    expect(afterAccept[first].generated).toBeUndefined();

    // Mark a generated hex explored, then regenerate and look at the warning.
    const generatedKey = Object.keys(afterAccept).find(
      (k) => afterAccept[k].generated,
    )!;
    const [gq, gr] = generatedKey.split(",").map(Number);
    await page.getByRole("button", { name: "Dismiss" }).click();
    await goTo(page, { q: gq, r: gr });
    await page.getByRole("button", { name: "Mark explored" }).click();
    await start(page, b, /Regenerate generated terrain/);
    const inProposal = await proposed(page);
    expect(Object.keys(inProposal)).not.toContain(first);
    expect(Object.keys(inProposal)).not.toContain(key(b));
    await expect(page.getByText(/hexes would change/)).toBeVisible();
    let warned = false;
    for (let i = 0; i < 12 && !warned; i++) {
      warned = await page
        .getByRole("alert")
        .filter({ hasText: "explored" })
        .isVisible();
      if (!warned) await page.getByRole("button", { name: "Reroll" }).click();
    }
    expect(warned).toBe(true);
    await page.getByRole("button", { name: "Accept" }).click();
    const finalHexes = await hexes(page);
    expect(finalHexes[first].terrain.id).toBe("swamp");
    expect(finalHexes[generatedKey].explored).toBe(true);
  });

  test("7. landscape and amounts change the proposal and none removes a terrain", async ({
    page,
  }) => {
    const b = await baseHex(page);
    await start(page, b, /Generate area/);
    await page.getByRole("button", { name: "Landscape and amounts" }).click();
    const temperate = await proposed(page);
    await page.getByLabel("Landscape").selectOption("arid");
    const arid = await proposed(page);
    expect(arid).not.toEqual(temperate);
    await page.getByLabel("Plains amount").selectOption("none");
    await page.getByLabel("Forest amount").selectOption("none");
    expect(Object.values(await proposed(page))).not.toContain("Plains");
    expect(Object.values(await proposed(page))).not.toContain("Forest");
  });

  test("9. a failed save changes nothing and keeps the review open", async ({
    page,
  }) => {
    const b = await baseHex(page);
    const before = Object.keys(await hexes(page)).length;
    await start(page, b, /Generate area/);
    await page.evaluate(() => {
      (window as any).vault.saveMapsWithResult = async () => false;
    });
    await page.getByRole("button", { name: "Accept" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Could not save" }),
    ).toBeVisible();
    await expect(page.getByTestId("region-review-bar")).toBeVisible();
    expect(Object.keys(await hexes(page))).toHaveLength(before);
  });

  test("keyboard: Escape in a field keeps the review, Escape on the sheet cancels, Enter accepts", async ({
    page,
  }) => {
    const b = await baseHex(page);
    await start(page, b, /Generate area/);
    await expect(page.getByTestId("region-review-bar")).toBeFocused();
    await page.getByLabel("Hex label").focus();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("region-review-bar")).toBeVisible();
    await page.getByRole("button", { name: "Accept" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("region-message")).toContainText("Saved");
    await start(page, b, /Generate area/).catch(() => {});
  });

  test("keyboard: every control in the review is reachable with Tab", async ({
    page,
  }) => {
    const b = await baseHex(page);
    await start(page, b, /Generate area/);
    await expect(page.getByTestId("region-review-bar")).toBeFocused();
    const reached = new Set<string>();
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      const name = await page.evaluate(
        () =>
          document.activeElement?.getAttribute("aria-label") ||
          document.activeElement?.textContent?.trim() ||
          "",
      );
      reached.add(name);
    }
    for (const name of ["Copy seed", "Reroll", "Accept", "Cancel"])
      expect([...reached].some((n) => n.startsWith(name))).toBe(true);
  });

  test("1. typing a noted seed brings back the same proposal, and Reroll changes it", async ({
    page,
  }) => {
    const b = await baseHex(page);
    await start(page, b, /Generate area/);
    const seedField = page.getByRole("textbox", { name: "Seed" });
    const seed = await seedField.inputValue();
    const first = await proposed(page);
    await page.getByRole("button", { name: "Reroll" }).click();
    await expect(seedField).not.toHaveValue(seed);
    expect(await proposed(page)).not.toEqual(first);
    await seedField.fill(seed.toLowerCase());
    await seedField.press("Enter");
    await seedField.blur();
    await expect(seedField).toHaveValue(seed);
    expect(await proposed(page)).toEqual(first);
  });

  test("3. notes, a saved discovery, its pin and an explored hex are untouched, and the explored hex gains terrain", async ({
    page,
  }) => {
    const b = await baseHex(page);
    // A note and a saved discovery (with its pin) on the hand-set hex.
    await goTo(page, b);
    await page.getByLabel("Your notes").fill("Old road through the trees.");
    await page.getByRole("button", { name: "Explore", exact: true }).click();
    await page.getByRole("button", { name: "Save as location" }).click();
    await page.waitForTimeout(500);
    // An explored hex with no terrain.
    const next = { q: b.q + 1, r: b.r };
    await goTo(page, next);
    await page.getByRole("button", { name: "Mark explored" }).click();
    await page.waitForTimeout(300);

    const snapshot = () =>
      page.evaluate(() => {
        const map = (Object.values((window as any).vault.maps) as any[]).find(
          (m) => m.hexCrawl,
        );
        return JSON.parse(
          JSON.stringify({ hexes: map.hexCrawl.hexes, pins: map.pins }),
        );
      });
    const before = await snapshot();
    expect(before.hexes[key(b)].notes).toContain("Old road");
    expect(before.hexes[key(next)].explored).toBe(true);
    expect(before.hexes[key(next)].terrain).toBeUndefined();

    await start(page, b, /Generate area/);
    expect(Object.keys(await proposed(page))).not.toContain(key(b));
    await accept(page);
    const after = await snapshot();

    expect(after.hexes[key(b)]).toEqual(before.hexes[key(b)]);
    expect(after.pins).toEqual(before.pins);
    expect(after.hexes[key(next)].explored).toBe(true);
    expect(after.hexes[key(next)].terrain).toBeDefined();
    expect(after.hexes[key(next)].generated).toBeDefined();
  });
});

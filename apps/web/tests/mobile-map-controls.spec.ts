import { expect, type Page, test } from "@playwright/test";
import path from "path";

test.describe.configure({ mode: "serial" });

// #3740: map controls must fit and stay usable on phone viewports.
async function openMapWithControls(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("codex_skip_landing", "true");
    localStorage.setItem(
      "codex-cryptica-help-state",
      JSON.stringify({ completedTours: ["initial-onboarding"] }),
    );
  });
  await page.goto("/?demo=fantasy");
  await page.waitForFunction(
    () => {
      const vault = (window as any).vault;
      return (
        vault?.isInitialized === true &&
        (vault.demoVaultName === "Fantasy Demo" ||
          (vault.allEntities?.length ?? 0) > 0)
      );
    },
    { timeout: 30000 },
  );
  await page.goto("/map");
  await page.click('button:has-text("Upload World Image")');
  await page.fill('input[id="map-name"]', "Mobile Map");
  const chooser = page.waitForEvent("filechooser");
  await page.locator('input[type="file"]').click();
  await (
    await chooser
  ).setFiles(path.join(process.cwd(), "static/favicon.png"));
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(page.locator("canvas")).toBeVisible({ timeout: 15000 });
}

for (const size of [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 844, height: 390 },
]) {
  test(`map controls fit ${size.width}x${size.height}`, async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize(size);
    await openMapWithControls(page);
    await page.getByRole("button", { name: /^LABELS/ }).waitFor();
    await page.screenshot({
      path: `test-results/map-${size.width}x${size.height}.png`,
    });
    const report = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const clipped = [
        ...document.querySelectorAll<HTMLElement>("button, input[type=range]"),
      ]
        .filter((el) => el.offsetParent !== null)
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && (r.left < -0.5 || r.right > vw + 0.5))
        .map(
          ({ el, r }) =>
            `${el.textContent?.trim().slice(0, 20) || el.getAttribute("type")} ${Math.round(r.left)}..${Math.round(r.right)}`,
        );
      return { overflow: document.documentElement.scrollWidth - vw, clipped };
    });
    console.log("MAP", size.width, JSON.stringify(report));
    expect(report.clipped).toEqual([]);
    expect(report.overflow).toBeLessThanOrEqual(1);
  });
}

test("map controls stay usable with touch at 390x844", async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  await openMapWithControls(page);
  const labels = page.getByRole("button", { name: /^LABELS/ });
  await labels.waitFor();

  // Every bar control is a comfortable tap target.
  const small = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("button")]
      .filter(
        (b) =>
          b.offsetParent !== null &&
          /LABELS|FOG|VISION:|PLAYER VIEW|GRID/.test(b.textContent ?? ""),
      )
      .map((b) => ({
        t: b.textContent?.trim(),
        h: b.getBoundingClientRect().height,
        w: b.getBoundingClientRect().width,
      }))
      .filter((b) => b.h < 44 || b.w < 44),
  );
  expect(small).toEqual([]);

  // Toggle labels.
  const before = (await labels.textContent())?.trim();
  await labels.click();
  await expect(labels).not.toHaveText(before ?? "");

  // Drag the vision-range slider.
  const slider = page.locator('input[type="range"]').first();
  const startValue = await slider.inputValue();
  const box = await slider.boundingBox();
  if (!box) throw new Error("slider not visible");
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2, {
    steps: 5,
  });
  await page.mouse.up();
  expect(await slider.inputValue()).not.toBe(startValue);

  // The bar's row wrapper must not swallow touches meant for the map.
  const hit = await page.evaluate(() => {
    const el = document.elementFromPoint(195, 600);
    return el?.tagName.toLowerCase();
  });
  expect(hit).toBe("canvas");

  // Layer popup stays on screen.
  // The dev-only Debug Log overlay can sit on top of this button.
  await page.getByRole("button", { name: /^Layer:/ }).dispatchEvent("click");
  const popup = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const panels = [...document.querySelectorAll<HTMLElement>("div")].filter(
      (d) =>
        /Layer/i.test(d.textContent ?? "") &&
        d.getBoundingClientRect().height > 40 &&
        d.getBoundingClientRect().width < vw,
    );
    return panels.every(
      (p) =>
        p.getBoundingClientRect().left >= -0.5 &&
        p.getBoundingClientRect().right <= vw + 0.5,
    );
  });
  expect(popup).toBe(true);
});

test("empty space beside the bar still reaches the map in landscape", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 844, height: 390 });
  await openMapWithControls(page);
  await page.getByRole("button", { name: /^LABELS/ }).waitFor();
  await page.waitForTimeout(800); // let the upload dialog finish fading out
  const hit = await page.evaluate(() => {
    const label = [...document.querySelectorAll<HTMLElement>("button")].find(
      (b) => /^LABELS/.test(b.textContent?.trim() ?? ""),
    );
    const bar = label?.closest("div.rounded-lg")?.getBoundingClientRect();
    if (!bar) return "no-bar";
    // Just left of the bar, in the same row: this used to be covered by a
    // full-width wrapper that swallowed pans and pinches.
    const x = bar.left - 6;
    const el = document.elementFromPoint(x, bar.top + bar.height / 2);
    return `${el?.tagName.toLowerCase()}|bar ${Math.round(bar.left)}..${Math.round(bar.right)}`;
  });
  expect(hit).toMatch(/^canvas\|/);
});

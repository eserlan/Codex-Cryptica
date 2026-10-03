import { expect, type Page, test } from "@playwright/test";

// #3718: mobile typography floor and touch targets.
async function fontSizes(page: Page, classes: string[]) {
  await page.goto("/");
  await page.waitForFunction(
    () =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--type-nano")
        .trim() !== "",
  );
  return page.evaluate(
    (list) => {
      return Object.fromEntries(
        list.map(([tag, cls]) => {
          const el = document.createElement(tag);
          el.className = cls;
          document.body.appendChild(el);
          const v = parseFloat(getComputedStyle(el).fontSize);
          el.remove();
          return [`${tag}.${cls}`, v];
        }),
      );
    },
    classes.map((c) => c.split(":")),
  );
}

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("semantic tokens resolve to the mobile scale", async ({ page }) => {
    const s = await fontSizes(page, [
      "span:text-nano",
      "span:text-micro",
      "span:text-meta",
      "span:text-helper",
      "span:text-xs",
      "span:text-body-ui",
    ]);
    expect(s["span.text-nano"]).toBe(13);
    expect(s["span.text-micro"]).toBe(13);
    expect(s["span.text-meta"]).toBe(13);
    expect(s["span.text-helper"]).toBe(14);
    expect(s["span.text-xs"]).toBe(14);
    expect(s["span.text-body-ui"]).toBe(16);
  });

  test("text inputs are at least 16px", async ({ page }) => {
    const s = await fontSizes(page, [
      "input:text-xs",
      "textarea:text-meta",
      "select:text-micro",
    ]);
    for (const v of Object.values(s)) expect(v).toBeGreaterThanOrEqual(16);
  });

  test("touch-target is at least 44px", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(
      () =>
        getComputedStyle(document.documentElement)
          .getPropertyValue("--type-nano")
          .trim() !== "",
    );
    const box = await page.evaluate(() => {
      const el = document.createElement("button");
      el.className = "touch-target";
      document.body.appendChild(el);
      const r = el.getBoundingClientRect();
      el.remove();
      return { w: r.width, h: r.height };
    });
    expect(box.w).toBeGreaterThanOrEqual(44);
    expect(box.h).toBeGreaterThanOrEqual(44);
  });
});

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("keeps compact sizes", async ({ page }) => {
    const s = await fontSizes(page, [
      "span:text-micro",
      "span:text-meta",
      "span:text-xs",
      "span:text-body-ui",
    ]);
    expect(s["span.text-micro"]).toBe(10);
    expect(s["span.text-meta"]).toBe(11);
    expect(s["span.text-xs"]).toBe(12);
    expect(s["span.text-body-ui"]).toBe(12);
  });
});

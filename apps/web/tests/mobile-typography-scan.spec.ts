import { expect, test } from "@playwright/test";
import { openOracle, seedEntity, setupVaultPage } from "./test-helpers";

// #3718 follow-up: with the larger mobile scale, key screens must not overflow
// horizontally, and no visible text may render below 13px.
test.use({ viewport: { width: 390, height: 844 } });

async function scan(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const tiny: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("body *")) {
      if (!el.childNodes.length) continue;
      const hasText = [...el.childNodes].some(
        (n) => n.nodeType === 3 && n.textContent?.trim(),
      );
      if (!hasText || el.offsetParent === null) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 13)
        tiny.push(
          `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} ${size}px`,
        );
    }
    return {
      overflow: doc.scrollWidth - doc.clientWidth,
      tiny: [...new Set(tiny)],
    };
  });
}

// Primary controls must be at least 44px on mobile. Decorative or sr-only
// elements are exempt; this guards the controls fixed for #3718.
async function smallControls(page: import("@playwright/test").Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("button, select, summary")]
      .filter((el) => el.offsetParent !== null)
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.width < 44 || r.height < 44);
      })
      .map(
        (el) =>
          el.getAttribute("data-testid") ||
          el.getAttribute("aria-label") ||
          el.textContent?.trim().slice(0, 30) ||
          el.className.slice(0, 40),
      ),
  );
}

test("vault shell has no horizontal overflow or sub-13px text", async ({
  page,
}) => {
  await setupVaultPage(page);
  await seedEntity(page, {
    type: "npc",
    title: "Scan Entity",
    content: "Body",
  });
  await page.waitForTimeout(500);
  const r = await scan(page);
  console.log("SCAN vault", JSON.stringify(r));
  await page.screenshot({ path: "test-results/scan-vault.png" });
  expect(r.overflow).toBeLessThanOrEqual(1);
  expect(r.tiny).toEqual([]);
});

test("entity detail and menu stay within the viewport", async ({ page }) => {
  await setupVaultPage(page);
  const id = await seedEntity(page, {
    type: "npc",
    title: "Scan Entity With A Rather Long Title To Test Wrapping",
    content: "Body text for the scan.",
  });
  await page
    .getByRole("button", { name: "Skip" })
    .click({ timeout: 3000 })
    .catch(() => {});
  await page.evaluate((eid) => {
    (window as any).vault.selectedEntityId = eid;
  }, id);
  await expect(page.getByTestId("entity-detail-panel")).toBeVisible({
    timeout: 10000,
  });
  await page.waitForTimeout(400);
  const detail = await scan(page);
  console.log("SCAN detail", JSON.stringify(detail));
  // Poll: the panel animates in, and rects are scaled until it settles.
  // Debug overlay is dev-only chrome, not product UI.
  await expect
    .poll(
      async () => (await smallControls(page)).filter((n) => !/Debug/.test(n)),
      {
        timeout: 5000,
      },
    )
    .toEqual([]);
  await page.screenshot({ path: "test-results/scan-detail.png" });
  expect(detail.overflow).toBeLessThanOrEqual(1);
  expect(detail.tiny).toEqual([]);
});

test("oracle panel stays legible", async ({ page }) => {
  await setupVaultPage(page);
  await page
    .getByRole("button", { name: "Skip" })
    .click({ timeout: 3000 })
    .catch(() => {});
  await openOracle(page);
  await page.waitForTimeout(400);
  const r = await scan(page);
  console.log("SCAN oracle", JSON.stringify(r));
  await page.screenshot({ path: "test-results/scan-oracle.png" });
  expect(r.overflow).toBeLessThanOrEqual(1);
  expect(r.tiny).toEqual([]);
});

for (const path of [
  "/generators",
  "/features",
  "/answers",
  "/blog",
  "/tools",
  "/worldbuilding-tool",
]) {
  test(`public page ${path} has no overflow or tiny text`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const r = await scan(page);
    console.log("SCAN", path, JSON.stringify(r));
    await page.screenshot({
      path: `test-results/scan${path.replace(/\//g, "-")}.png`,
    });
    expect(r.overflow).toBeLessThanOrEqual(1);
    expect(r.tiny).toEqual([]);
  });
}

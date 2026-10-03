import { expect, test } from "@playwright/test";
import { seedEntity, setupVaultPage } from "./test-helpers";

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
  await page.screenshot({ path: "test-results/scan-detail.png" });
  expect(detail.overflow).toBeLessThanOrEqual(1);
  expect(detail.tiny).toEqual([]);
});

import { expect, test, type Page } from "@playwright/test";

async function generate(page: Page, count: string) {
  await page.goto("/generators/point-crawl");
  await expect(page.getByTestId("point-crawl-graph")).toBeVisible();
  await expect(page.getByTestId("generator-continuation-callout")).toHaveCount(
    0,
  );
  const ai = page.locator("#ai-toggle");
  if ((await ai.count()) && (await ai.isChecked())) await ai.uncheck();
  await page.locator("#point-crawl-point-count-select").selectOption(count);
  await page.locator("#generate-button").click();
  await expect(
    page.getByTestId("generator-continuation-callout"),
  ).toBeVisible();
  await expect(page.getByTestId("point-crawl-save-count")).toContainText(
    `Saving ${count} of ${count} points`,
  );
  await expect(page.locator("#save-to-codex-btn")).toHaveCount(1);
  return page.locator("h2").first().innerText();
}

test("point crawl saves selected locations and opens a linked overview Note", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const title = await generate(page, "8");
  for (const href of [
    "/answers/how-do-you-build-a-point-crawl-for-an-rpg",
    "/answers/point-crawl-vs-hex-crawl",
    "/examples/the-receding-tide-road-point-crawl",
  ]) {
    await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();
    expect((await request.get(href)).ok()).toBe(true);
  }
  for (const width of [360, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByTestId("point-crawl-select-core").click();
  const countText = await page
    .getByTestId("point-crawl-save-count")
    .innerText();
  const selectedCount = Number(countText.match(/Saving (\d+) of/)?.[1]);
  expect(selectedCount).toBeGreaterThan(0);
  expect(selectedCount).toBeLessThan(8);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Add to my Codex" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("goal-invitation")).toHaveCount(0);
  await expect(page.getByTestId("mobile-coach-mark")).toHaveCount(0);
  const main = page.getByTestId("entity-main-text");
  await expect(main).toContainText("Crawl Premise & Entry");
  const gm = page.getByTestId("entity-gm-notes");
  const toggle = gm.getByRole("button", { name: /GM notes/ });
  if ((await toggle.getAttribute("aria-expanded")) === "false")
    await toggle.click();
  await expect(gm).toContainText("GM Navigation & Key-Lock Reference");
  await expect(main).not.toContainText("GM Navigation & Key-Lock Reference");
  await page.waitForFunction(
    () => !localStorage.getItem("__codex_pending_import"),
  );
  await page.goto("/table");
  const rows = page.getByTestId("entity-table-row");
  await expect(rows).toHaveCount(selectedCount + 1, { timeout: 30_000 });
  await expect(rows.filter({ hasText: title })).toContainText("Note");
  await expect(rows.filter({ hasText: "Location" })).toHaveCount(selectedCount);
  await page.reload();
  await expect(rows).toHaveCount(selectedCount + 1, { timeout: 30_000 });
  await page.setViewportSize({ width: 1280, height: 844 });
  const second = await generate(page, "6");
  await page.getByTestId("point-crawl-select-all").click();
  await expect(page.getByTestId("point-crawl-save-count")).toContainText(
    "Saving 6 of 6 points",
  );
  await page.locator("#save-to-codex-btn").focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: second, exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(
    () => !localStorage.getItem("__codex_pending_import"),
  );
  await expect(page.getByText(/Added .* to Default Vault/)).toBeVisible();
  await page.goto("/table");
  await expect(rows).toHaveCount(selectedCount + 8, { timeout: 30_000 });
  await page.reload();
  await expect(rows).toHaveCount(selectedCount + 8, { timeout: 30_000 });
});

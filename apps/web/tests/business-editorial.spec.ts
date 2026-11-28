import { expect, test, type Page } from "@playwright/test";

async function generateBusiness(page: Page, playersOwn: boolean) {
  await page.goto("/generators/business");
  await expect(
    page.getByRole("heading", { name: "The Crooked Compass", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("generator-continuation-callout")).toHaveCount(
    0,
  );
  const ai = page.locator("#ai-toggle");
  if ((await ai.count()) && (await ai.isChecked())) await ai.uncheck();
  await page.locator("#business-type-select").selectOption("Blacksmith");
  await page.locator("#business-location-input").fill("Grey Quay");
  await page.locator("#business-scale-select").selectOption("small");
  await page.getByLabel("Players own this business").setChecked(playersOwn);
  await page.locator("#generate-button").click();
  await expect(
    page.getByTestId("generator-continuation-callout"),
  ).toBeVisible();
  await expect(page.locator("#save-to-codex-btn")).toHaveCount(1);
  await expect(page.locator("#copy-markdown-btn")).toBeVisible();
  return page.locator("h2").first().innerText();
}

test("Business imports its organisation and linked people, preserves its secret and persists across reload", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const title = await generateBusiness(page, false);
  for (const href of [
    "/answers/how-do-i-turn-economic-pressures-into-rpg-adventure-hooks",
    "/answers/how-do-i-run-a-campaign-where-the-players-own-a-business",
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
    await expect(page.locator("#save-to-codex-btn")).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Add to my Codex" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/", {
    timeout: 30_000,
  });
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("goal-invitation")).toHaveCount(0);
  await expect(page.getByTestId("mobile-coach-mark")).toHaveCount(0);
  const main = page.getByTestId("entity-main-text");
  await expect(main).toContainText("Suppliers and Dependencies");
  await expect(main).toContainText("Competitors and Relationships");
  await expect(
    main.getByRole("heading", { name: "Secret", exact: true }),
  ).toHaveCount(0);
  const gm = page.getByTestId("entity-gm-notes");
  const toggle = gm.getByRole("button", { name: /GM notes/ });
  if ((await toggle.getAttribute("aria-expanded")) === "false")
    await toggle.click();
  await expect(gm).toContainText("Secret");
  await expect(
    page.getByText("owned by", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("employs", { exact: true }).first(),
  ).toBeVisible();
  await page.goto("/table");
  const rows = page.getByTestId("entity-table-row");
  await expect(rows.filter({ hasText: title })).toContainText("Faction");
  await expect(rows.filter({ hasText: "Character" }).first()).toBeVisible();
  const count = await rows.count();
  expect(count).toBeGreaterThan(1);
  await page.reload();
  await expect(rows).toHaveCount(count, { timeout: 30_000 });
  await page.setViewportSize({ width: 1280, height: 844 });
  const other = await generateBusiness(page, true);
  await page.locator("#save-to-codex-btn").focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL((url) => url.pathname === "/", {
    timeout: 30_000,
  });
  await expect(
    page.getByRole("heading", { name: other, exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("entity-main-text")).toContainText(
    "Management",
  );
  await page.goto("/table");
  await expect(rows.filter({ hasText: other })).toContainText("Faction");
  expect(await rows.count()).toBeGreaterThan(count);
});

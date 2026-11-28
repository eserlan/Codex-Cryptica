import { expect, test, type Page } from "@playwright/test";

async function generateCreature(page: Page, role: string) {
  await page.goto("/generators/creature");
  await expect(
    page.getByRole("heading", { name: "Coral-Weaver", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("generator-continuation-callout")).toHaveCount(
    0,
  );
  const ai = page.locator("#ai-toggle");
  if ((await ai.count()) && (await ai.isChecked())) await ai.uncheck();
  await page
    .locator("#creature-category-select")
    .selectOption("Magical Beast / Chimera");
  await page
    .locator("#creature-habitat-select")
    .selectOption("Mountain Peaks / Cliffs");
  await page
    .locator("#creature-threat-select")
    .selectOption("Dangerous / Predator");
  await page.locator("#creature-ecological-role-select").selectOption(role);
  await page.locator("#generate-button").click();
  await expect(
    page.getByTestId("generator-continuation-callout"),
  ).toBeVisible();
  await expect(page.locator("#save-to-codex-btn")).toHaveCount(1);
  await expect(page.locator("#copy-markdown-btn")).toBeVisible();
  return page.locator("h2").first().innerText();
}

test("Creature editorial journey opens one persisted Creature with private ecological notes", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const title = await generateCreature(page, "Territorial Guardian");
  for (const href of [
    "/answers/what-makes-a-good-random-encounter",
    "/answers/how-do-i-balance-rpg-combat-encounters-without-a-tpk",
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
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("goal-invitation")).toHaveCount(0);
  await expect(page.getByTestId("mobile-coach-mark")).toHaveCount(0);
  const main = page.getByTestId("entity-main-text");
  await expect(main).toContainText("Field Signs");
  await expect(main).toContainText("Territorial Guardian");
  await expect(main).not.toContainText("Secret Weaknesses");
  const gm = page.getByTestId("entity-gm-notes");
  const toggle = gm.getByRole("button", { name: /GM notes/ });
  if ((await toggle.getAttribute("aria-expanded")) === "false")
    await toggle.click();
  for (const value of [
    "True Origin & Hidden Ecology",
    "Secret Weaknesses",
    "Adventure & Encounter Hooks",
  ])
    await expect(gm).toContainText(value);
  await page.goto("/table");
  const rows = page.getByTestId("entity-table-row");
  await expect(rows).toHaveCount(1, { timeout: 30_000 });
  await expect(rows.filter({ hasText: title })).toContainText("Creature");
  await page.reload();
  await expect(rows).toHaveCount(1, { timeout: 30_000 });
  await page.setViewportSize({ width: 1280, height: 844 });
  const second = await generateCreature(page, "Herbivore / Migratory Grazer");
  await page.locator("#save-to-codex-btn").focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: second, exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await page.goto("/table");
  await expect(rows).toHaveCount(2, { timeout: 30_000 });
});

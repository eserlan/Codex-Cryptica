import { expect, test, type Page } from "@playwright/test";

async function generateNation(page: Page, context: string) {
  await page.goto("/generators/nation");
  await expect(
    page.getByRole("heading", {
      name: "Axiom Industrial Authority",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByTestId("generator-continuation-callout")).toHaveCount(
    0,
  );
  const ai = page.locator("#ai-toggle");
  if ((await ai.count()) && (await ai.isChecked())) await ai.uncheck();
  await page.locator("#nation-genre-select").selectOption("Fantasy");
  await page.locator("#nation-polity-select").selectOption("Republic");
  await page.locator("#nation-govt-select").selectOption("Elected council");
  await page
    .locator("#nation-scale-select")
    .selectOption("Small region (handful of towns)");
  await page
    .locator("#nation-conflict-select")
    .selectOption("Simmering tensions");
  await page.locator("#nation-context").fill(context);
  await page.locator("#generate-button").click();
  await expect(
    page.getByTestId("generator-continuation-callout"),
  ).toBeVisible();
  await expect(page.locator("#save-to-codex-btn")).toHaveCount(1);
  await expect(page.locator("#copy-markdown-btn")).toBeVisible();
  return page.locator("h2").first().innerText();
}

test("Nation editorial journey opens a persistent Faction with public state and GM seeds", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const title = await generateNation(page, "The Grey River tariff dispute");
  for (const href of [
    "/answers/how-do-i-give-different-civilisations-distinct-strengths-and-weaknesses",
    "/answers/how-do-i-run-political-intrigue-and-faction-play",
    "/answers/how-do-i-build-a-believable-constitutional-crisis-or-coup",
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
  await expect(main).toContainText("The Grey River tariff dispute");
  await expect(main).toContainText("Society & Tensions");
  await expect(main).not.toContainText("Hidden Problem");
  await expect(main).not.toContainText("Entity Seeds");
  const gm = page.getByTestId("entity-gm-notes");
  const toggle = gm.getByRole("button", { name: /GM notes/ });
  if ((await toggle.getAttribute("aria-expanded")) === "false")
    await toggle.click();
  for (const value of [
    "Hidden Problem",
    "Power Blocs",
    "Rumours & Hooks",
    "Entity Seeds",
    "Centre of Power",
  ])
    await expect(gm).toContainText(value);
  await page.goto("/table");
  await expect(page.getByTestId("entity-table-row")).toHaveCount(1, {
    timeout: 30_000,
  });
  await expect(
    page.getByTestId("entity-table-row").filter({ hasText: title }),
  ).toContainText("Faction");
  await page.reload();
  await expect(page.getByTestId("entity-table-row")).toHaveCount(1, {
    timeout: 30_000,
  });
  await page.setViewportSize({ width: 1280, height: 844 });
  const other = await generateNation(page, "A disputed bridge");
  await page.locator("#save-to-codex-btn").focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: other, exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await page.goto("/table");
  await expect(page.getByTestId("entity-table-row")).toHaveCount(2, {
    timeout: 30_000,
  });
});

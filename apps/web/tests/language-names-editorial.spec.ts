import { expect, test, type Page } from "@playwright/test";

async function generateLanguage(page: Page, tone: string) {
  await page.goto("/generators/language-generator");
  await expect(
    page.getByRole("heading", { name: "Iofielefana", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("generator-continuation-callout")).toHaveCount(
    0,
  );
  const ai = page.locator("#ai-toggle");
  if ((await ai.count()) && (await ai.isChecked())) await ai.uncheck();
  await page.locator("#language-tone-select").selectOption(tone);
  await page.locator("#generate-button").click();
  await expect(
    page.getByTestId("generator-continuation-callout"),
  ).toBeVisible();
  await expect(page.locator("#save-to-codex-btn")).toHaveCount(1);
  return page.locator("h2").first().innerText();
}
test("language saves its vocabulary and GM reference in one persisted Note", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const title = await generateLanguage(page, "Lyrical & Vowel-rich");
  for (const href of [
    "/answers/how-do-you-create-a-fictional-language-for-an-rpg",
    "/answers/how-do-i-make-different-cultures-feel-distinct-without-relying-on-stereotypes",
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
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Add to my Codex" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("goal-invitation")).toHaveCount(0);
  await expect(page.getByTestId("mobile-coach-mark")).toHaveCount(0);
  const main = page.getByTestId("entity-main-text");
  for (const text of [
    "Pronunciation & Phonology",
    "Common Vocabulary & Word Bank",
    "Sample Phrases",
  ])
    await expect(main).toContainText(text);
  const gm = page.getByTestId("entity-gm-notes");
  const toggle = gm.getByRole("button", { name: /GM notes/ });
  if ((await toggle.getAttribute("aria-expanded")) === "false")
    await toggle.click();
  for (const text of ["Example Names", "At the Table"]) {
    await expect(gm).toContainText(text);
    await expect(main).not.toContainText(text);
  }
  await page.waitForFunction(
    () => !localStorage.getItem("__codex_pending_import"),
  );
  await page.goto("/table");
  const rows = page.getByTestId("entity-table-row");
  await expect(rows).toHaveCount(1, { timeout: 30_000 });
  await expect(rows.filter({ hasText: title })).toContainText("Note");
  await page.reload();
  await expect(rows).toHaveCount(1, { timeout: 30_000 });
  await page.setViewportSize({ width: 1280, height: 844 });
  const second = await generateLanguage(page, "Harsh & Consonant-heavy");
  await page.locator("#save-to-codex-btn").focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: second, exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(
    () => !localStorage.getItem("__codex_pending_import"),
  );
  await expect(
    page.getByText(`Added "${second}" to Default Vault`, { exact: true }),
  ).toBeVisible();
  await page.goto("/table");
  await expect(rows).toHaveCount(2, { timeout: 30_000 });
  await page.reload();
  await expect(rows).toHaveCount(2, { timeout: 30_000 });
});
test("RPG Names is copy-first and does not create a vault batch", async ({
  context,
  page,
  request,
}) => {
  test.setTimeout(120_000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/generators/names");
  const panel = page.getByRole("region", { name: "Quick names" });
  await expect(panel).toBeVisible();
  const names = panel.getByRole("list", { name: "Names" });
  await expect(names.getByRole("listitem")).toHaveCount(10);
  const first = names.getByRole("button", { name: /^Copy / }).first();
  const name = await first.innerText();
  await first.click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(name);
  await names.getByRole("button", { name: `Pin ${name}`, exact: true }).click();
  await panel.getByRole("button", { name: "New names", exact: true }).click();
  await expect(panel.getByText(name, { exact: true }).first()).toBeVisible();
  await panel
    .getByRole("button", { name: "Copy pinned (1)", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(name);
  await panel
    .getByRole("button", { name: `Unpin ${name}`, exact: true })
    .click();
  await panel.getByRole("button", { name: "Copy all", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await page.evaluate(() => navigator.clipboard.readText()))
          .trim()
          .split("\n").length,
    )
    .toBeGreaterThanOrEqual(10);
  await page.getByText("See example names with notes", { exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Generic Fantasy Names — Person",
      exact: true,
    }),
  ).toBeVisible();
  const ai = page.locator("#ai-toggle");
  if ((await ai.count()) && (await ai.isChecked())) await ai.uncheck();
  await page.locator("#name-type-select").selectOption("Place");
  await page.locator("#generate-button").click();
  await expect(
    page.getByRole("heading", { name: /Names — Place/ }),
  ).toBeVisible();
  await expect(page.getByTestId("generator-continuation-callout")).toHaveCount(
    0,
  );
  await expect(page.locator("#save-to-codex-btn")).toHaveCount(0);
  await expect(page.locator("#copy-markdown-btn")).toBeVisible();
  await page.locator("#copy-markdown-btn").click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("Names — Place");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.match(/^- \*\*.+\*\*$/gm)).toHaveLength(10);
  expect(
    await page.evaluate(() => localStorage.getItem("__codex_pending_import")),
  ).toBeNull();
  for (const href of [
    "/answers/how-do-you-improvise-npcs-on-the-spot",
    "/answers/how-do-you-create-a-fictional-language-for-an-rpg",
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
});

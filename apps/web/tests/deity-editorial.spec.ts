import { expect, test, type Page } from "@playwright/test";

async function generate(page: Page, mode: "single" | "pantheon") {
  await page.goto("/generators/god-generator");
  await expect(
    page.getByRole("heading", { name: "Oros, the Light of Dawn", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("generator-continuation-callout")).toHaveCount(
    0,
  );
  const ai = page.locator("#ai-toggle");
  if ((await ai.count()) && (await ai.isChecked())) await ai.uncheck();
  await page.locator("#pantheon-mode-select").selectOption(mode);
  await page.locator("#pantheon-domain-select").selectOption("Light");
  await page
    .locator("#pantheon-worshippers-select")
    .selectOption("Folk Devotion");
  await page.locator("#generate-button").click();
  await expect(
    page.getByTestId("generator-continuation-callout"),
  ).toBeVisible();
  await expect(page.locator("#save-to-codex-btn")).toHaveCount(1);
  await expect(page.locator("#copy-markdown-btn")).toBeVisible();
  return page.locator("h2").first().innerText();
}

test("God route saves a persisted Character and alternate Pantheon Faction with private GM notes", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const title = await generate(page, "single");
  for (const href of [
    "/answers/how-do-you-create-a-believable-fictional-religion",
    "/answers/can-multiple-gods-share-a-domain",
    "/answers/how-do-you-create-a-pantheon",
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
  await expect(main).toContainText("Worship & Cults");
  const gm = page.getByTestId("entity-gm-notes");
  const toggle = gm.getByRole("button", { name: /GM notes/ });
  if ((await toggle.getAttribute("aria-expanded")) === "false")
    await toggle.click();
  for (const heading of ["Rituals & Taboos", "Secret", "Adventure Hooks"]) {
    await expect(gm).toContainText(heading);
    await expect(main).not.toContainText(heading);
  }
  await page.waitForFunction(
    () => !localStorage.getItem("__codex_pending_import"),
  );
  await page.goto("/table");
  const rows = page.getByTestId("entity-table-row");
  await expect(rows).toHaveCount(1, { timeout: 30_000 });
  await expect(rows.filter({ hasText: title })).toContainText("Character");
  await page.reload();
  await expect(rows).toHaveCount(1, { timeout: 30_000 });
  await page.setViewportSize({ width: 1280, height: 844 });
  const second = await generate(page, "pantheon");
  await page.locator("#save-to-codex-btn").focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: second, exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  if ((await toggle.getAttribute("aria-expanded")) === "false")
    await toggle.click();
  await expect(gm).toContainText("Hidden Problem");
  await expect(main).not.toContainText("Hidden Problem");
  await page.waitForFunction(
    () => !localStorage.getItem("__codex_pending_import"),
  );
  await expect(
    page.getByText(`Added "${second}" to Default Vault`, { exact: true }),
  ).toBeVisible();
  await page.goto("/table");
  await expect(rows).toHaveCount(2, { timeout: 30_000 });
  await expect(rows.filter({ hasText: second })).toContainText("Faction");
  await page.reload();
  await expect(rows).toHaveCount(2, { timeout: 30_000 });
});

import { expect, test, type Page } from "@playwright/test";

async function generateCase(page: Page, mysteryType: string) {
  await page.goto("/generators/mystery-investigation");
  await expect(
    page.getByRole("heading", {
      name: "The Missing Toll Apprentice",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByTestId("generator-continuation-callout")).toHaveCount(
    0,
  );
  const ai = page.locator("#ai-toggle");
  if ((await ai.count()) && (await ai.isChecked())) await ai.uncheck();
  await page.locator("#mystery-type").selectOption(mysteryType);
  await page.locator("#mystery-complexity").selectOption("Lean (3 suspects)");
  await page.locator("#mystery-clue-density").selectOption("Generous");
  await page.locator("#generate-button").click();
  await expect(
    page.getByTestId("generator-continuation-callout"),
  ).toBeVisible();
  await expect(page.locator("#save-to-codex-btn")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Copy Player Handout" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Copy GM Case File" }),
  ).toBeVisible();
  return page.locator("h2").first().innerText();
}

test("Mystery editorial journey opens a persisted case Note with fixed truth in GM notes", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const title = await generateCase(page, "Disappearance");
  for (const href of [
    "/answers/how-do-you-run-a-mystery-without-railroading",
    "/answers/how-do-i-get-a-stalled-rpg-investigation-moving-again",
    "/answers/how-do-you-handle-players-reaching-the-wrong-conclusion-in-an-rpg-mystery",
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
  await expect(main).toContainText("Evidence");
  await expect(main).not.toContainText("GM-Only Fixed Truth");
  const gm = page.getByTestId("entity-gm-notes");
  const toggle = gm.getByRole("button", { name: /GM notes/ });
  if ((await toggle.getAttribute("aria-expanded")) === "false")
    await toggle.click();
  for (const heading of ["GM-Only Fixed Truth", "Timeline", "Next NPC Moves"])
    await expect(gm).toContainText(heading);
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
  let second = await generateCase(page, "Theft");
  // Distinct titles ensure the second arrival assertion cannot match the first Note.
  if (second === title) {
    await page.locator("#generate-button").click();
    await expect
      .poll(() => page.locator("h2").first().innerText())
      .not.toBe(title);
    second = await page.locator("h2").first().innerText();
  }
  expect(second).not.toBe(title);
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
});

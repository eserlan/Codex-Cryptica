import { expect, test, type Page } from "@playwright/test";

async function generatePuzzle(page: Page, context: string) {
  await page.goto("/generators/puzzle");
  await expect(
    page.getByRole("heading", { name: "The Counterweight Gate", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("generator-continuation-callout")).toHaveCount(
    0,
  );
  const ai = page.locator("#ai-toggle");
  if ((await ai.count()) && (await ai.isChecked())) await ai.uncheck();
  await page.locator("#puzzle-purpose").selectOption("Sealed door");
  await page.locator("#puzzle-style").selectOption("Mechanical");
  await page.locator("#puzzle-complexity").selectOption("Simple");
  await page.locator("#puzzle-context").fill(context);
  await page
    .locator("#puzzle-capabilities")
    .fill("Smith's tools and a familiar");
  await page.locator("#generate-button").click();
  await expect(
    page.getByTestId("generator-continuation-callout"),
  ).toBeVisible();
  await expect(page.locator("#save-to-codex-btn")).toHaveCount(1);
  await expect(page.locator("#copy-markdown-btn")).toBeVisible();
  return page.locator("h2").first().innerText();
}

test("Puzzle editorial journey keeps clues and alternate approaches with its private solution", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const title = await generatePuzzle(page, "An abandoned mill");
  for (const href of [
    "/answers/how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
    "/answers/how-do-you-give-hints-for-an-rpg-puzzle-without-giving-away-the-answer",
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
  await expect(main).toContainText("Player-Facing Setup");
  await expect(main).toContainText("Alternate Solutions");
  await expect(main).not.toContainText("GM-Only Solution");
  const gm = page.getByTestId("entity-gm-notes");
  const toggle = gm.getByRole("button", { name: /GM notes/ });
  if ((await toggle.getAttribute("aria-expanded")) === "false")
    await toggle.click();
  for (const value of [
    "GM-Only Solution",
    "Escalating Hints",
    "An abandoned mill",
  ])
    await expect(gm).toContainText(value);
  await page.goto("/table");
  const rows = page.getByTestId("entity-table-row");
  await expect(rows).toHaveCount(1, { timeout: 30_000 });
  await expect(rows.filter({ hasText: title })).toContainText("Note");
  await page.reload();
  await expect(rows).toHaveCount(1, { timeout: 30_000 });
  await page.setViewportSize({ width: 1280, height: 844 });
  // Use a different purpose for a distinct second title in the existing vault.
  await page.goto("/generators/puzzle");
  const ai = page.locator("#ai-toggle");
  if ((await ai.count()) && (await ai.isChecked())) await ai.uncheck();
  await page.locator("#puzzle-purpose").selectOption("Retrieve object");
  await page.locator("#generate-button").click();
  await expect(
    page.getByTestId("generator-continuation-callout"),
  ).toBeVisible();
  const second = await page.locator("h2").first().innerText();
  await page.locator("#save-to-codex-btn").focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: second, exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await page.goto("/table");
  await expect(rows).toHaveCount(2, { timeout: 30_000 });
});

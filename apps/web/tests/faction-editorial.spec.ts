import { expect, test, type Page } from "@playwright/test";

async function generateFaction(page: Page, context: string) {
  await page.goto("/generators/faction");
  await expect(
    page.getByRole("heading", { name: "The Iron Syndicate", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("generator-continuation-callout")).toHaveCount(
    0,
  );
  const ai = page.locator("#ai-toggle");
  if ((await ai.count()) && (await ai.isChecked())) await ai.uncheck();
  await page.locator("#faction-type-select").selectOption("Merchant Guild");
  await page.locator("#faction-scope-select").selectOption("Single city");
  await page.locator("#faction-campaign-context").fill(context);
  await page.locator("#generate-button").click();
  await expect(
    page.getByTestId("generator-continuation-callout"),
  ).toBeVisible();
  await expect(page.locator("#save-to-codex-btn")).toHaveCount(1);
  await expect(page.locator("#copy-markdown-btn")).toBeVisible();
  return page.locator("h2").first().innerText();
}

test("Faction editorial journey preserves the organisation and GM material in a persistent vault", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const title = await generateFaction(page, "An embargo on Grey Quay");
  for (const href of [
    "/answers/how-do-you-create-a-fantasy-faction",
    "/answers/how-do-i-run-political-intrigue-and-faction-play",
    "/answers/how-do-you-track-faction-turns-between-rpg-sessions",
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
  const content = page.getByTestId("entity-main-text");
  await expect(content).toContainText("What they control");
  await expect(content).not.toContainText("Why they are dangerous");
  await expect(content).not.toContainText("Internal Conflict");
  const gm = page.getByTestId("entity-gm-notes");
  const toggle = gm.getByRole("button", { name: /GM notes/ });
  if ((await toggle.getAttribute("aria-expanded")) === "false")
    await toggle.click();
  for (const value of [
    "Why they are dangerous",
    "Secret",
    "Immediate Hook",
    "Notable NPCs",
    "Internal Conflict",
    "Rival Faction",
    "An embargo on Grey Quay",
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
  const other = await generateFaction(page, "A contested ferry");
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

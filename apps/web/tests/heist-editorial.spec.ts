import { expect, test, type Page } from "@playwright/test";

async function generateHeist(page: Page, prize: string) {
  await page.goto("/generators/heist");
  await expect(
    page.getByRole("heading", { name: "The Thormar Lift", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("generator-continuation-callout")).toHaveCount(
    0,
  );
  const ai = page.locator("#ai-toggle");
  if ((await ai.count()) && (await ai.isChecked())) await ai.uncheck();
  await page.locator("#heist-type-select").selectOption("Theft");
  await page.locator("#heist-target-select").selectOption("Guild Vault");
  await page.locator("#heist-scale-select").selectOption("Major");
  await page.locator("#heist-prize").fill(prize);
  await page.locator("#generate-button").click();
  await expect(
    page.getByTestId("generator-continuation-callout"),
  ).toBeVisible();
  await expect(page.locator("#save-to-codex-btn")).toHaveCount(1);
  await expect(page.locator("#copy-markdown-btn")).toBeVisible();
  return page.locator("h2").first().innerText();
}

test("Heist editorial journey preserves casing and GM response plan in an Event", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const title = await generateHeist(page, "A fragile royal seal");
  for (const href of [
    "/answers/what-makes-a-good-heist-target-in-a-tabletop-rpg",
    "/answers/how-do-you-run-a-heist-in-a-tabletop-rpg",
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
  await expect(main).toContainText("Casing the Target");
  await expect(main).toContainText("fragile royal seal");
  await expect(main).not.toContainText("The Hidden Factor");
  await expect(main).not.toContainText("Alarm Track");
  const gm = page.getByTestId("entity-gm-notes");
  const toggle = gm.getByRole("button", { name: /GM notes/ });
  if ((await toggle.getAttribute("aria-expanded")) === "false")
    await toggle.click();
  for (const value of [
    "The Hidden Factor",
    "Security Rings",
    "Alarm Track",
    "Complications",
    "The Getaway",
    "Flashback Opportunities",
  ])
    await expect(gm).toContainText(value);
  await page.goto("/table");
  const rows = page.getByTestId("entity-table-row");
  await expect(rows).toHaveCount(1, { timeout: 30_000 });
  await expect(rows.filter({ hasText: title })).toContainText("Event");
  await page.reload();
  await expect(rows).toHaveCount(1, { timeout: 30_000 });
  await page.setViewportSize({ width: 1280, height: 844 });
  const other = await generateHeist(page, "A lost guild charter");
  await page.locator("#save-to-codex-btn").focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: other, exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await page.goto("/table");
  await expect(rows).toHaveCount(2, { timeout: 30_000 });
});

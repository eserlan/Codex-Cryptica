import { expect, test, type Page } from "@playwright/test";

async function generate(page: Page, type: string, context: string) {
  await page.goto("/generators/magic-item");
  await expect(
    page.getByRole("heading", { name: "Frostbite Blade", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("generator-continuation-callout")).toHaveCount(
    0,
  );
  const ai = page.locator("#ai-toggle");
  if ((await ai.count()) && (await ai.isChecked())) await ai.uncheck();
  await page.locator("#item-type-select").selectOption(type);
  await page.locator("#rarity-select").selectOption("Uncommon");
  await page.locator("#magic-item-campaign-context").fill(context);
  await page.locator("#generate-button").click();
  await expect(
    page.getByTestId("generator-continuation-callout"),
  ).toBeVisible();
  await expect(page.locator("#save-to-codex-btn")).toHaveCount(1);
  await expect(page.locator("#copy-markdown-btn")).toBeVisible();
  await expect(page.locator("#send-to-monsterlabs-btn")).toBeVisible();
  return page.locator("h2").first().innerText();
}

test("magic Item handoff preserves its appearance and private powers", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const context = "Winter Watch of Ashford";
  const title = await generate(page, "Weapon", context);
  for (const href of [
    "/answers/how-much-loot-and-how-many-magic-items-should-i-give-my-players",
    "/answers/how-do-i-upgrade-a-player-characters-weapon-without-replacing-it",
    "/answers/how-do-you-create-a-magic-system",
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
  await expect(main).toContainText("Description");
  await expect(main).toContainText("Lore & History");
  await expect(main).toContainText(context);
  const gm = page.getByTestId("entity-gm-notes");
  const toggle = gm.getByRole("button", { name: /GM notes/ });
  if ((await toggle.getAttribute("aria-expanded")) === "false")
    await toggle.click();
  for (const heading of ["Magical Properties", "Passive Effect", "Uncommon"]) {
    await expect(gm).toContainText(heading);
    await expect(main).not.toContainText(heading);
  }
  await page.waitForFunction(
    () => !localStorage.getItem("__codex_pending_import"),
  );
  await page.goto("/table");
  const rows = page.getByTestId("entity-table-row");
  await expect(rows).toHaveCount(1, { timeout: 30_000 });
  await expect(rows.filter({ hasText: title })).toContainText("Item");
  await page.reload();
  await expect(rows).toHaveCount(1, { timeout: 30_000 });
  await page.setViewportSize({ width: 1280, height: 844 });
  const second = await generate(page, "Ring", "River Guild");
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

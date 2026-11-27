import { expect, test, type Page } from "@playwright/test";

async function generateRoster(page: Page, faction: string) {
  await page.goto("/generators/faction-roster");
  await expect(
    page.getByRole("heading", {
      name: "The Lantern Wardens' Notable Members",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByTestId("generator-continuation-callout")).toHaveCount(
    0,
  );
  const ai = page.locator("#ai-toggle");
  if ((await ai.count()) && (await ai.isChecked())) await ai.uncheck();
  await page
    .locator("#faction-roster-context")
    .fill(
      `Faction: ${faction}\nA council controlling river crossings.\n\n### Notable NPCs\n- **👤 Mara Fen**: Ferrymaster and keeper of the toll ledger.\n- **👤 Oren Pike**: River scout who wants free passage for refugees.`,
    );
  await page.locator("#faction-roster-size-select").selectOption("3");
  await page
    .locator("#faction-roster-structure-select")
    .selectOption("Council");
  await page
    .locator("#faction-roster-emphasis-select")
    .selectOption("Internal dissent");
  await page
    .locator("#faction-roster-campaign-context")
    .fill("The bridge closes at dusk.");
  await page.locator("#generate-button").click();
  await expect(
    page.getByTestId("generator-continuation-callout"),
  ).toBeVisible();
  const title = await page.locator("h2").first().innerText();
  expect(title).toBe(`${faction}'s Notable Members`);
  await expect(
    page.getByRole("button", { name: /Open .+ as a Character/ }),
  ).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: /Open Mara Fen/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Open Oren Pike/ }),
  ).toBeVisible();
  await expect(page.locator("#copy-markdown-btn")).toBeVisible();
  await expect(page.locator("#save-to-codex-btn")).toHaveCount(1);
  return title;
}

test("Faction Roster editorial page preserves one Note and individual character actions through mobile and desktop imports", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const title = await generateRoster(page, "The Lantern Wardens");

  for (const href of [
    "/answers/how-do-i-roleplay-npcs-if-im-not-good-at-acting",
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
    await expect(
      page.getByRole("button", { name: "Add to my Codex" }),
    ).toBeVisible();
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
  await expect(content).toContainText("Mara Fen");
  await expect(content).toContainText("Oren Pike");
  await expect(content).toContainText("Leverage");
  await expect(content).toContainText("Connection");
  const gmNotes = page.getByTestId("entity-gm-notes");
  await expect(gmNotes).toBeVisible();
  const toggle = gmNotes.getByRole("button", { name: /GM notes/ });
  if ((await toggle.getAttribute("aria-expanded")) === "false")
    await toggle.click();
  await expect(gmNotes).toContainText("How This Roster Divides");
  await expect(gmNotes).toContainText("The bridge closes at dusk.");
  await page.goto("/table");
  await expect(page.getByTestId("entity-table-row")).toHaveCount(1, {
    timeout: 30_000,
  });
  await expect(
    page.getByTestId("entity-table-row").filter({ hasText: title }),
  ).toContainText("Note");

  await page.reload();
  await expect(page.getByTestId("entity-table-row")).toHaveCount(1, {
    timeout: 30_000,
  });
  await page.setViewportSize({ width: 1280, height: 844 });
  const importedRow = page
    .getByTestId("entity-table-row")
    .filter({ hasText: title });
  await expect(importedRow).toContainText("RPG-FACTION");
  await expect(importedRow).toContainText("FACTION-ROSTER");
  await expect(importedRow).toContainText("FACTION-ROSTER-GENERATOR");
  const second = await generateRoster(page, "The River Guild");
  await page.getByRole("button", { name: "Add to my Codex" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: second, exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("goal-invitation")).toHaveCount(0);
  await page.goto("/table");
  await expect(page.getByTestId("entity-table-row")).toHaveCount(2, {
    timeout: 30_000,
  });
  await expect(
    page.getByTestId("entity-table-row").filter({ hasText: title }),
  ).toBeVisible();
  await expect(
    page.getByTestId("entity-table-row").filter({ hasText: second }),
  ).toBeVisible();

  await generateRoster(page, "The Toll Council");
  await page.getByRole("button", { name: /Open Mara Fen/ }).click();
  await expect(page).toHaveURL(/\/generators\/npc(?:\?|$)/);
  const npcContext = page.locator("#rpgnpc-campaign-context");
  await expect(npcContext).toHaveValue(/Mara Fen/);
  await expect(npcContext).toHaveValue(/The Toll Council/);
});

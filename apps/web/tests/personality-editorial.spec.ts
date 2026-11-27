import { expect, test, type Page } from "@playwright/test";

async function generatePersonality(page: Page) {
  await page.goto("/generators/personality");
  await expect(
    page.getByRole("heading", { name: "Iona Pell", exact: true }),
  ).toBeVisible();
  const modeNote = page.getByText(/Non-AI mode picks a/);
  await expect(modeNote).toBeVisible();
  await expect(modeNote).toContainText("prewritten personality at random");
  await expect(page.getByTestId("generator-continuation-callout")).toHaveCount(
    0,
  );
  const ai = page.locator("#ai-toggle");
  if ((await ai.count()) && (await ai.isChecked())) await ai.uncheck();
  await page
    .locator("#personality-role-select")
    .selectOption("Contact / Informant");
  await page
    .locator("#personality-social-style-select")
    .selectOption("Guarded");
  await page
    .locator("#personality-moral-outlook-select")
    .selectOption("Loyalty above all");
  await page
    .locator("#personality-relationship-context")
    .fill("A reluctant informant for the party.");
  await page
    .locator("#personality-campaign-context")
    .fill("A closed gate at dusk.");
  await page.locator("#generate-button").click();
  await expect(
    page.getByTestId("generator-continuation-callout"),
  ).toBeVisible();
  const title = await page.locator("h2").first().innerText();
  await expect(page.locator("#save-to-codex-btn")).toHaveCount(1);
  await expect(page.locator("#copy-markdown-btn")).toBeVisible();
  await expect(page.locator("#refine-draft-btn")).toBeVisible();
  await expect(page.locator("#send-to-monsterlabs-btn")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /copy link|share this result/i }),
  ).toBeVisible();
  return title;
}

test("Personality editorial page preserves cues and GM reference as one new Character in mobile and desktop vaults", async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const title = await generatePersonality(page);

  for (const href of [
    "/answers/how-do-you-make-npcs-memorable-without-lots-of-prep",
    "/answers/how-do-i-roleplay-npcs-if-im-not-good-at-acting",
    "/answers/how-do-you-keep-track-of-npcs-in-a-long-campaign",
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
  await page.locator("#copy-markdown-btn").click();
  await expect(page.locator("#copy-markdown-btn")).toContainText("Copied!");
  const markdown = await page.evaluate(() => navigator.clipboard.readText());
  expect(markdown).toContain(title);
  expect(markdown).toContain("Roleplaying Cues");
  expect(markdown).toContain("Under Pressure");

  await page.getByRole("button", { name: "Add to my Codex" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("goal-invitation")).toHaveCount(0);
  await expect(page.getByTestId("mobile-coach-mark")).toHaveCount(0);
  const content = page.getByTestId("entity-main-text");
  await expect(content).toContainText("Core Personality");
  await expect(content).toContainText("Speech & Conversational Style");
  await expect(content).toContainText("Mannerism / Tell");
  await expect(content).toContainText("Roleplaying Cues");
  await expect(content).not.toContainText("Virtue and Flaw");
  await expect(content).not.toContainText("Under Pressure");
  const gmNotes = page.getByTestId("entity-gm-notes");
  await expect(gmNotes).toBeVisible();
  const toggle = gmNotes.getByRole("button", { name: /GM notes/ });
  if ((await toggle.getAttribute("aria-expanded")) === "false")
    await toggle.click();
  await expect(gmNotes).toContainText("Drives");
  await expect(gmNotes).toContainText("Virtue and Flaw");
  await expect(gmNotes).toContainText("Contradiction");
  await expect(gmNotes).toContainText("Under Pressure");
  await expect(gmNotes).toContainText("Boundary / Trigger");
  await expect(gmNotes).toContainText("Example Reactions");

  await page.goto("/table");
  await expect(page.getByTestId("entity-table-row")).toHaveCount(1, {
    timeout: 30_000,
  });
  await page.reload();
  await expect(page.getByTestId("entity-table-row")).toHaveCount(1, {
    timeout: 30_000,
  });
  await page.setViewportSize({ width: 1280, height: 844 });
  const importedRow = page
    .getByTestId("entity-table-row")
    .filter({ hasText: title });
  await expect(importedRow).toContainText("Character");
  await expect(importedRow).toContainText("PERSONALITY");
  await expect(importedRow).toContainText("PERSONALITY-GENERATOR");
  await expect(importedRow).toContainText("IMPORTED-DRAFT");

  const second = await generatePersonality(page);
  await page.getByRole("button", { name: "Add to my Codex" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: second, exact: true }),
  ).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("goal-invitation")).toHaveCount(0);
  await page.goto("/table");
  const rows = page.getByTestId("entity-table-row");
  await expect(rows).toHaveCount(2, { timeout: 30_000 });
  // Placeholder names are random and may repeat; importing still makes a
  // separate Character rather than overwriting the first.
  await expect(rows.filter({ hasText: title })).toHaveCount(
    title === second ? 2 : 1,
  );
  await expect(rows.filter({ hasText: second })).toHaveCount(
    title === second ? 2 : 1,
  );
  for (const row of await rows.all())
    await expect(row).toContainText("Character");
});

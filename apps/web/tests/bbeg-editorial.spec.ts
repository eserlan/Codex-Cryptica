import { expect, test, type Page } from "@playwright/test";

async function generateVillain(page: Page) {
  await page.goto("/generators/bbeg-generator");
  await expect(
    page.getByRole("heading", { name: "Governor Ysra Holt", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#villain-campaign-context-help")).toContainText(
    "With AI, add a world",
  );
  await expect(page.getByTestId("generator-continuation-callout")).toHaveCount(
    0,
  );
  const ai = page.locator("#ai-toggle");
  if ((await ai.count()) && (await ai.isChecked())) await ai.uncheck();
  await page.locator("#villain-theme-select").selectOption("Classic Fantasy");
  await page.locator("#villain-tone-select").selectOption("Tragic");
  await page.locator("#villain-threat-scale-select").selectOption("Regional");
  await page.locator("#villain-archetype-select").selectOption("Corrupt Ruler");
  await page
    .locator("#villain-sympathy-select")
    .selectOption("Understandable, Still Wrong");
  await page.locator("#villain-world-relation-select").selectOption("Guardian");
  await page
    .locator("#villain-campaign-context")
    .fill("A flood threatens three riverside towns.");
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

async function openGmNotes(page: Page) {
  const notes = page.getByTestId("entity-gm-notes");
  await expect(notes).toBeVisible();
  const toggle = notes.getByRole("button", { name: /GM notes/ });
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute("aria-expanded")) === "false")
    await toggle.click();
  return notes;
}

async function reopenPersistedVillain(page: Page, title: string) {
  const row = page.getByTestId("entity-table-row").filter({ hasText: title });
  await expect(row).toContainText("Character");
  await expect(row).toContainText("VILLAIN");
  await expect(row).toContainText("BBEG-GENERATOR");
  await expect(row).toContainText("IMPORTED-DRAFT");
  // The first import itself must not show onboarding. The shared first-run
  // invitation can reappear after a full reload (#5328); dismiss it normally
  // to verify the actual stored data without bypassing the UI.
  const invitation = page.getByTestId("goal-invitation");
  if (await invitation.isVisible()) {
    console.log("Shared first-run invitation returned after reload (#5328)");
    await invitation.getByTestId("goal-invitation-close").click();
    await expect(invitation).toHaveCount(0);
  }
  await row.getByTestId("entity-table-row-link").click({ timeout: 10_000 });
  await expect(page.getByTestId("zen-mode-modal")).toBeVisible();
  await expect(page.getByTestId("entity-main-text")).toContainText(
    "Public Face",
  );
  await expect(page.getByTestId("entity-main-text")).not.toContainText(
    "The Villain's Plan",
  );
  await expect(await openGmNotes(page)).toContainText("The Villain's Plan");
  await page
    .getByTestId("zen-mode-modal")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await expect(page.getByTestId("zen-mode-modal")).toBeHidden();
  await expect(page).toHaveURL(/\/table$/);
}

test("BBEG editorial page preserves the public face and the full private plan in fresh and existing vaults", async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const title = await generateVillain(page);

  for (const href of [
    "/answers/how-do-i-plan-story-arcs-for-an-rpg-campaign",
    "/answers/how-do-i-make-a-campaign-threat-feel-urgent-without-railroading",
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
  await page.locator("#copy-markdown-btn").click();
  await expect(page.locator("#copy-markdown-btn")).toContainText("Copied!");
  const markdown = await page.evaluate(() => navigator.clipboard.readText());
  expect(markdown).toContain(title);
  expect(markdown).toContain("Public Face");
  expect(markdown).toContain("The Villain's Plan");

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
  for (const heading of [
    "Public Face",
    "Signature / Calling Card",
    "First Signs",
  ]) {
    await expect(content).toContainText(heading);
  }
  const gmNotes = await openGmNotes(page);
  for (const heading of [
    "Core Concept",
    "True Nature",
    "Ultimate Goal",
    "Why Now",
    "Motivation",
    "Fatal Flaw",
    "Methods",
    "Resources",
    "Lieutenants & Inner Circle",
    "Organisation & Power Structure",
    "Territory / Lair",
    "The Villain's Plan",
    "Escalation If Ignored",
    "Discovery Layers",
    "Personal Connections",
    "Weakness / Vulnerability",
    "Moral Complication",
    "Final Confrontation",
    "If Defeated",
  ]) {
    await expect(gmNotes).toContainText(heading);
    await expect(content).not.toContainText(heading);
  }

  await page.goto("/table");
  await expect(page.getByTestId("entity-table-row")).toHaveCount(1, {
    timeout: 30_000,
  });
  await page.reload();
  await expect(page.getByTestId("entity-table-row")).toHaveCount(1, {
    timeout: 30_000,
  });
  await page.setViewportSize({ width: 1280, height: 844 });
  await reopenPersistedVillain(page, title);

  const second = await generateVillain(page);
  await page.getByRole("button", { name: "Add to my Codex" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: second, exact: true }),
  ).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("goal-invitation")).toHaveCount(0);
  await expect(page.getByTestId("entity-main-text")).not.toContainText(
    "The Villain's Plan",
  );
  await expect(await openGmNotes(page)).toContainText("The Villain's Plan");
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

test("Saving a BBEG from the Session Hub preserves the original public and GM fields", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 844 });
  const title = await generateVillain(page);
  await page
    .getByRole("button", { name: "Save selected (1)", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("goal-invitation")).toHaveCount(0);
  const content = page.getByTestId("entity-main-text");
  await expect(content).toContainText("Public Face");
  await expect(content).not.toContainText("True Nature");
  await expect(content).not.toContainText("The Villain's Plan");
  const notes = await openGmNotes(page);
  await expect(notes).toContainText("True Nature");
  await expect(notes).toContainText("The Villain's Plan");
  await page.goto("/table");
  await expect(page.getByTestId("entity-table-row")).toHaveCount(1, {
    timeout: 30_000,
  });
});

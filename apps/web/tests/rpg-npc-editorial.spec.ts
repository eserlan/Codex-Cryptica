import { expect, test, type Page } from "@playwright/test";

type Mode = "table-card" | "dossier";

async function generateNpc(page: Page, mode: Mode, path = "/generators/npc") {
  await page.goto(path);
  await expect(
    page.getByRole("heading", { name: "Mara Reed", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#rpgnpc-campaign-context-help")).toContainText(
    "Non-AI",
  );
  await expect(page.getByTestId("generator-continuation-callout")).toHaveCount(
    0,
  );
  const ai = page.locator("#ai-toggle");
  if ((await ai.count()) && (await ai.isChecked())) await ai.uncheck();
  await page.locator("#rpgnpc-theme-select").selectOption("Classic Fantasy");
  await page.locator("#rpgnpc-ancestry-select").selectOption("Human");
  await page.locator("#rpgnpc-role-select").selectOption("Guard");
  await page.locator("#rpgnpc-alignment-select").selectOption("common_good");
  await page.locator("#rpgnpc-mode-select").selectOption(mode);
  await page
    .locator("#rpgnpc-campaign-context")
    .fill("A harbour checkpoint after a stolen cargo");
  await page.locator("#generate-button").click();
  await expect(
    page.getByTestId("generator-continuation-callout"),
  ).toBeVisible();
  await expect(page.locator("#save-to-codex-btn")).toHaveCount(1);
  await expect(page.locator("#copy-markdown-btn")).toBeVisible();
  await expect(page.locator("#refine-draft-btn")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /copy link|share this result/i }),
  ).toBeVisible();
  return page.locator("h2").first().innerText();
}

async function assertNpcFields(page: Page, mode: Mode) {
  const content = page.getByTestId("entity-main-text");
  const notes = page.getByTestId("entity-gm-notes");
  await expect(notes).toBeVisible();
  const toggle = notes.getByRole("button", { name: /GM notes/ });
  if ((await toggle.getAttribute("aria-expanded")) === "false")
    await toggle.click();
  const visible =
    mode === "table-card"
      ? [
          "The Six Elements",
          "Immediate Want",
          "Physical Mannerism",
          "Sharp Contradiction",
          "Relationship Hook",
          "Sensory Tag",
          "Table Delivery",
        ]
      : [
          "Who they are",
          "What they want",
          "Why they are useful",
          "How to use them at the table",
        ];
  const privateFields =
    mode === "table-card"
      ? ["Knowledge & Secrets", "Faction Connection", "Moral Stance"]
      : [
          "Secret:",
          "Immediate Hook",
          "Leverage & Price",
          "Faction Stance & Biases",
          "Faction Connection",
          "Personality",
        ];
  for (const heading of visible) await expect(content).toContainText(heading);
  for (const heading of privateFields) {
    await expect(content).not.toContainText(heading);
    await expect(notes).toContainText(heading);
  }
}

async function assertArrival(page: Page, title: string, mode: Mode) {
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("goal-invitation")).toHaveCount(0);
  await expect(page.getByTestId("mobile-coach-mark")).toHaveCount(0);
  await assertNpcFields(page, mode);
}

test("RPG NPC Table Card and Full Dossier survive the fresh and existing vault journey", async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const first = await generateNpc(page, "table-card");
  for (const href of [
    "/answers/how-do-you-improvise-npcs-on-the-spot",
    "/answers/how-do-i-handle-players-asking-an-npc-to-tell-us-everything-you-know",
    "/answers/how-do-you-organise-npc-relationships",
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
  await page.locator("#copy-markdown-btn").click();
  await expect(page.locator("#copy-markdown-btn")).toContainText("Copied!");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "Knowledge & Secrets",
  );
  await page.getByRole("button", { name: "Add to my Codex" }).click();
  await assertArrival(page, first, "table-card");
  await page.goto("/table");
  await expect(page.getByTestId("entity-table-row")).toHaveCount(1, {
    timeout: 30_000,
  });
  await page.reload();
  const row = page.getByTestId("entity-table-row");
  await expect(row).toHaveCount(1, { timeout: 30_000 });
  await expect(row).toContainText(first);
  for (const label of [
    "Character",
    "TABLE-CARD",
    "GUARD",
    "RPG-CHARACTER",
    "+2",
  ])
    await expect(row).toContainText(label);
  await page.setViewportSize({ width: 1280, height: 844 });
  const invitation = page.getByTestId("goal-invitation");
  if (await invitation.isVisible())
    await invitation.getByTestId("goal-invitation-close").click();
  await row.getByTestId("entity-table-row-link").click();
  await expect(page.getByTestId("zen-mode-modal")).toBeVisible();
  await assertNpcFields(page, "table-card");
  for (const label of [
    "table-card",
    "guard",
    "rpg-character",
    "npc-generator",
    "imported-draft",
  ]) {
    await expect(
      page.getByTestId("label-badge").filter({ hasText: label }),
    ).toBeVisible();
  }
  await page
    .getByTestId("zen-mode-modal")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await expect(page.getByTestId("zen-mode-modal")).toBeHidden();
  const second = await generateNpc(page, "dossier", "/tools/rpg-npc-generator");
  await page.getByRole("button", { name: "Add to my Codex" }).focus();
  await page.keyboard.press("Enter");
  await assertArrival(page, second, "dossier");
  await page.goto("/table");
  await expect(page.getByTestId("entity-table-row")).toHaveCount(2, {
    timeout: 30_000,
  });
  for (const saved of await page.getByTestId("entity-table-row").all())
    await expect(saved).toContainText("Character");
});

test("Full Dossier Session Hub saves the same private reference in a fresh vault", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 844 });
  const title = await generateNpc(page, "dossier");
  await page
    .getByRole("button", { name: "Save selected (1)", exact: true })
    .click();
  await assertArrival(page, title, "dossier");
  await page.goto("/table");
  await expect(page.getByTestId("entity-table-row")).toHaveCount(1, {
    timeout: 30_000,
  });
});

import { expect, test, type Page } from "@playwright/test";

async function generateItem(page: Page, type: string, context: string) {
  await page.goto("/generators/item");
  await expect(
    page.getByRole("heading", { name: "The Tollwarden's Ring", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("generator-continuation-callout")).toHaveCount(
    0,
  );
  const ai = page.locator("#ai-toggle");
  if ((await ai.count()) && (await ai.isChecked())) await ai.uncheck();
  await page.locator("#item-type-select").selectOption(type);
  await page.locator("#rarity-select").selectOption("Common");
  await page.locator("#magic-item-campaign-context").fill(context);
  await page.locator("#generate-button").click();
  const callout = page.getByTestId("generator-continuation-callout");
  await expect(callout).toBeVisible();
  const title = await page.locator("h2").first().innerText();
  expect(title).toContain(`(${type})`);
  await expect(page.locator("#save-to-codex-btn")).toHaveCount(1);
  await expect(page.locator("#copy-markdown-btn")).toBeVisible();
  await expect(page.locator("#refine-draft-btn")).toBeVisible();
  await expect(page.locator("#send-to-monsterlabs-btn")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /copy link|share this result/i }),
  ).toBeVisible();
  return title;
}

test("Item editorial page keeps the find's narrative and separate GM properties through fresh and existing vault imports", async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const campaignContext = "A ring found in the tollhouse strongbox.";
  const title = await generateItem(page, "Ring", campaignContext);

  for (const href of [
    "/answers/how-much-loot-and-how-many-magic-items-should-i-give-my-players",
    "/answers/how-do-i-upgrade-a-player-characters-weapon-without-replacing-it",
    "/answers/what-can-players-actually-buy-and-sell-in-a-fantasy-settlement",
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
  expect(markdown).toContain("Magical Properties");
  expect(markdown).toContain(campaignContext);
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
  await expect(content).toContainText("Description");
  await expect(content).toContainText("Lore & History");
  await expect(content).toContainText(campaignContext);
  await expect(content).not.toContainText("Magical Properties");
  const gmNotes = page.getByTestId("entity-gm-notes");
  await expect(gmNotes).toBeVisible();
  const toggle = gmNotes.getByRole("button", { name: /GM notes/ });
  if ((await toggle.getAttribute("aria-expanded")) === "false")
    await toggle.click();
  await expect(gmNotes).toContainText("GM Reference Information");
  await expect(gmNotes).toContainText("Magical Properties");
  await expect(gmNotes).toContainText("Common");
  await expect(gmNotes).not.toContainText(campaignContext);

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
  await expect(importedRow).toContainText("Item");
  await expect(importedRow).toContainText("RPG-ITEM");
  await expect(importedRow).toContainText("IMPORTED-DRAFT");

  const second = await generateItem(
    page,
    "Potion",
    "Found in a riverside apothecary.",
  );
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
  await expect(page.getByTestId("entity-table-row")).toHaveCount(2, {
    timeout: 30_000,
  });
  await expect(importedRow).toBeVisible();
  await expect(
    page.getByTestId("entity-table-row").filter({ hasText: second }),
  ).toContainText("Item");
});

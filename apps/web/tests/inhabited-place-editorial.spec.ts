import { expect, test, type Page } from "@playwright/test";

const cases = [
  {
    slug: "settlement",
    sample: "Cinderveil",
    control: "#environment-select",
    first: "Forest edge",
    second: "Mountain pass",
    gm: [
      "Current Tension",
      "Points of Interest",
      "Notable Inhabitants",
      "Adventure Hooks",
    ],
    main: "Core Concept",
    type: "Location",
    links: [
      "/answers/how-do-i-design-a-geographically-realistic-town-or-village",
      "/answers/how-do-i-decide-what-a-settlement-produces-imports-and-exports",
      "/answers/what-should-an-rpg-settlement-contain",
    ],
  },
  {
    slug: "tavern",
    sample: "The Copper Boar",
    control: "#tavern-settlement-select",
    first: "Market town",
    second: "Coastal port",
    gm: [
      "The Trouble",
      "Hidden Problem",
      "Notable Patrons",
      "Rumours",
      "Entity Seeds",
    ],
    main: "The Place",
    type: "Location",
    links: [
      "/answers/what-should-an-rpg-settlement-contain",
      "/answers/how-to-create-rumours-for-a-fantasy-town",
    ],
  },
  {
    slug: "kingdom",
    sample: "The Kingdom of Vaelthorn",
    control: "#kingdom-conflict-select",
    first: "At peace",
    second: "Total war",
    gm: [
      "Government & Power",
      "Hidden Problem",
      "Major Factions",
      "Rumours & Hooks",
      "Entity Seeds",
    ],
    main: "The Realm",
    type: "Faction",
    links: [
      "/answers/how-do-i-give-different-civilisations-distinct-strengths-and-weaknesses",
      "/answers/how-do-i-run-political-intrigue-and-faction-play",
    ],
  },
];

for (const entry of cases) {
  async function generate(page: Page, value: string) {
    await page.goto(`/generators/${entry.slug}`);
    await expect(
      page.getByRole("heading", { name: entry.sample, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByTestId("generator-continuation-callout"),
    ).toHaveCount(0);
    const ai = page.locator("#ai-toggle");
    if ((await ai.count()) && (await ai.isChecked())) await ai.uncheck();
    await page.locator(entry.control).selectOption(value);
    await page.locator("#generate-button").click();
    await expect(
      page.getByTestId("generator-continuation-callout"),
    ).toBeVisible();
    await expect(page.locator("#save-to-codex-btn")).toHaveCount(1);
    await expect(page.locator("#copy-markdown-btn")).toBeVisible();
    return page.locator("h2").first().innerText();
  }

  test(`${entry.slug} opens a persisted entry with private GM reference`, async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    const title = await generate(page, entry.first);
    for (const href of entry.links) {
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
    await expect(main).toContainText(entry.main);
    const gm = page.getByTestId("entity-gm-notes");
    const toggle = gm.getByRole("button", { name: /GM notes/ });
    if ((await toggle.getAttribute("aria-expanded")) === "false")
      await toggle.click();
    for (const heading of entry.gm) {
      await expect(gm).toContainText(heading);
      await expect(main).not.toContainText(heading);
    }
    await page.waitForFunction(
      () => !localStorage.getItem("__codex_pending_import"),
    );
    await page.goto("/table");
    const rows = page.getByTestId("entity-table-row");
    await expect(rows).toHaveCount(1, { timeout: 30_000 });
    await expect(rows.filter({ hasText: title })).toContainText(entry.type);
    await page.reload();
    await expect(rows).toHaveCount(1, { timeout: 30_000 });
    await page.setViewportSize({ width: 1280, height: 844 });
    let second = await generate(page, entry.second);
    if (second === title) {
      await page.locator("#generate-button").click();
      await expect
        .poll(() => page.locator("h2").first().innerText())
        .not.toBe(title);
      second = await page.locator("h2").first().innerText();
    }
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
}

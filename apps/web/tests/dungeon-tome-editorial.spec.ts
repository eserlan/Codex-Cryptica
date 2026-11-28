import { expect, test, type Page } from "@playwright/test";
const cases = [
  {
    slug: "dungeon-generator",
    sample: "The Submerged Vault of Sunken Runes",
    control: "#dungeon-scale-select",
    first: "Small Lair (2 Sectors)",
    second: "Medium Complex (3-4 Sectors)",
    type: "Location",
    main: "Sector 1:",
    gm: [
      "Dungeon Layout",
      "Central Secret / Boss Mystery",
      "Hazards & Traps",
      "Treasures & Artifacts",
      "Adventure Hooks & Rumours",
    ],
    links: [
      "/answers/how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
      "/answers/how-do-i-run-exploration-in-a-huge-ruined-city",
      "/answers/what-ttrpg-should-i-use-for-a-fantasy-dungeon-crawl",
    ],
  },
  {
    slug: "tome",
    sample: "The Drowned Liturgy of the Fen Gate",
    control: "#tome-hazard-select",
    first: "Physical / Environmental Hazard",
    second: "Supernatural / Entity Attraction",
    type: "Item",
    main: "Contents & Revelations",
    gm: [
      "Ground Truth for the GM",
      "The Objective Truth",
      "Connected Entities",
      "Quick Checks & Mechanics",
    ],
    links: [
      "/answers/how-do-i-give-players-immersive-handouts-in-an-online-rpg",
      "/answers/how-do-you-run-a-mystery-without-railroading",
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
    await page.locator(entry.control).selectOption(value, { timeout: 15000 });
    await page.locator("#generate-button").click();
    await expect(
      page.getByTestId("generator-continuation-callout"),
    ).toBeVisible();
    await expect(page.locator("#save-to-codex-btn")).toHaveCount(1);
    return page.locator("h2").first().innerText();
  }
  test(`${entry.slug} opens and persists the actual entity with private details`, async ({
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
    if (entry.main) await expect(main).toContainText(entry.main);
    else await expect(main).toContainText(title);
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
    await page.reload();
    await expect(rows).toHaveCount(2, { timeout: 30_000 });
  });
}

import { expect, test, type Page } from "@playwright/test";
const cases = [
  {
    slug: "origin-generator",
    sample: "Nightglass",
    control: "#origin-type",
    first: "Technology",
    second: "Scientific Experiment",
    type: "Character",
    main: "What the World Knows",
    gm: ["The Full Truth", "Ongoing Consequence", "Who Knows", "Further Hooks"],
    links: [
      "/answers/how-do-you-use-player-backstories-in-an-rpg-campaign-world",
      "/answers/how-do-i-plan-story-arcs-for-an-rpg-campaign",
    ],
  },
  {
    slug: "star-system",
    sample: "Lantern Verge",
    control: "#star-system-type-select",
    first: "Single Star",
    second: "Binary System",
    type: "Location",
    main: "Major Bodies",
    gm: ["History", "System-Wide Conflict or Mystery", "Adventure Hooks"],
    links: [
      "/answers/how-do-i-run-common-character-roles-in-a-sci-fi-or-space-opera-rpg",
      "/answers/how-do-i-give-different-civilisations-distinct-strengths-and-weaknesses",
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

test("Fantasy Names is copy-first and does not create a vault batch", async ({
  context,
  page,
  request,
}) => {
  test.setTimeout(120_000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/generators/fantasy-names");
  const panel = page.getByRole("region", { name: "Quick names" });
  await expect(panel).toBeVisible();
  const names = panel.getByRole("list", { name: "Names" });
  await expect(names.getByRole("listitem")).toHaveCount(10);
  const first = names.getByRole("button", { name: /^Copy / }).first();
  const name = await first.innerText();
  await first.click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(name);
  await names.getByRole("button", { name: `Pin ${name}`, exact: true }).click();
  await panel.getByRole("button", { name: "New names", exact: true }).click();
  await expect(panel.getByText(name, { exact: true }).first()).toBeVisible();
  await panel
    .getByRole("button", { name: "Copy pinned (1)", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(name);
  await panel
    .getByRole("button", { name: `Unpin ${name}`, exact: true })
    .click();
  await panel.getByRole("button", { name: "Copy all", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await page.evaluate(() => navigator.clipboard.readText()))
          .trim()
          .split("\n").length,
    )
    .toBeGreaterThanOrEqual(10);
  await page.getByText("See example names with notes", { exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Generic Fantasy Names — Person",
      exact: true,
    }),
  ).toBeVisible();
  const ai = page.locator("#ai-toggle");
  if ((await ai.count()) && (await ai.isChecked())) await ai.uncheck();
  await page.locator("#name-type-select").selectOption("Place");
  await page.locator("#generate-button").click();
  await expect(
    page.getByRole("heading", { name: /Names — Place/ }),
  ).toBeVisible();
  await expect(page.getByTestId("generator-continuation-callout")).toHaveCount(
    0,
  );
  await expect(page.locator("#save-to-codex-btn")).toHaveCount(0);
  await expect(page.locator("#copy-markdown-btn")).toBeVisible();
  await page.locator("#copy-markdown-btn").click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("Names — Place");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.match(/^- \*\*.+\*\*$/gm)).toHaveLength(10);
  expect(
    await page.evaluate(() => localStorage.getItem("__codex_pending_import")),
  ).toBeNull();
  for (const href of [
    "/answers/how-do-i-improvise-npcs-in-dnd",
    "/answers/how-do-you-create-a-fictional-language-for-an-rpg",
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
});

import { expect, test, type Page } from "@playwright/test";

const cases = [
  {
    slug: "adventure-generator",
    sample: "The Witness Who Came Back",
    control: "#adventure-scale-select",
    first: "Short Arc (2-3 Sessions)",
    second: "One-Shot (Single Session)",
    gm: [
      "Initial Situation",
      "Primary Objective & Pressure",
      "Key Locations",
      "Possible Outcomes",
    ],
    main: "",
    links: [
      "/answers/how-do-i-turn-an-rpg-idea-into-an-adventure",
      "/answers/how-do-i-plan-story-arcs-for-an-rpg-campaign",
    ],
  },
  {
    slug: "rumour",
    sample: "Word Around Town",
    control: "#rumour-danger-level",
    first: "Low",
    second: "High",
    gm: ["Reality", "What's Actually Happening", "If Investigated"],
    main: "Rumour 6",
    links: [
      "/answers/how-do-you-generate-useful-rpg-rumours",
      "/answers/how-to-create-rumours-for-a-fantasy-town",
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

  test(`${entry.slug} keeps prep private in a persisted Note`, async ({
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
    if (entry.slug === "adventure-generator") {
      await expect(page.locator("#build-adventure-canvas-btn")).toBeVisible();
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
    await expect(rows.filter({ hasText: title })).toContainText("Note");
    await page.reload();
    await expect(rows).toHaveCount(1, { timeout: 30_000 });
    await page.setViewportSize({ width: 1280, height: 844 });
    let second = await generate(page, entry.second);
    if (entry.slug === "adventure-generator" && second === title) {
      await page.locator("#generate-button").click();
      await expect
        .poll(() => page.locator("h2").first().innerText())
        .not.toBe(title);
      second = await page.locator("h2").first().innerText();
    }
    await page.getByRole("button", { name: "Add to my Codex" }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
    await expect(
      page
        .getByRole("heading", {
          name: new RegExp(second.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
        })
        .first(),
    ).toBeVisible({ timeout: 30_000 });
    await page.waitForFunction(
      () => !localStorage.getItem("__codex_pending_import"),
    );
    await expect(page.getByText(/Added ".+" to Default Vault/)).toBeVisible();
    await page.goto("/table");
    await expect(rows).toHaveCount(2, { timeout: 30_000 });
    await page.reload();
    await expect(rows).toHaveCount(2, { timeout: 30_000 });
  });
}

test("Adventure Canvas persists its separate handoff after reload", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/generators/adventure-generator");
  const ai = page.locator("#ai-toggle");
  if ((await ai.count()) && (await ai.isChecked())) await ai.uncheck();
  await page.locator("#generate-button").click();
  await expect(
    page.getByTestId("generator-continuation-callout"),
  ).toBeVisible();
  const title = await page.locator("h2").first().innerText();
  await page.locator("#build-adventure-canvas-btn").click();
  await expect(page).toHaveURL(/\/canvas/, { timeout: 30_000 });
  await expect(
    page.getByRole("region", { name: "Canvas Workspace" }),
  ).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(
    () => !localStorage.getItem("__codex_pending_canvas"),
  );
  // #5359: initial arrival can show an empty workspace despite a successful
  // import. Check persisted content independently until arrival is fixed.
  await page.reload();
  await expect(page.getByText(title, { exact: true }).first()).toBeVisible({
    timeout: 30_000,
  });
});

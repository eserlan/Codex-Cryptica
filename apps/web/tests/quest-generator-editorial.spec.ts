import { expect, test } from "@playwright/test";

test("Quest guide, example and continuation work from generation through vault import", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/generators/quest");
  await expect(
    page.getByRole("heading", { name: "The Millrace Ultimatum" }),
  ).toBeVisible();
  await expect(page.getByText("Example", { exact: true })).toBeVisible();
  await expect(page.getByTestId("generator-continuation-callout")).toHaveCount(
    0,
  );

  for (const href of [
    "/answers/how-do-you-create-quest-hooks-without-railroading",
    "/answers/how-do-i-make-a-campaign-threat-feel-urgent-without-railroading",
    "/answers/how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign",
  ]) {
    await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();
    expect((await request.get(href)).ok()).toBe(true);
  }

  const aiToggle = page.locator("#ai-toggle");
  if ((await aiToggle.count()) && (await aiToggle.isChecked())) {
    await aiToggle.uncheck();
  }
  await page.click("#generate-button");
  const callout = page.getByTestId("generator-continuation-callout");
  await expect(callout).toBeVisible();
  await expect(callout).toContainText("Keep this quest alive between sessions");
  const title = await page.locator("h2").first().innerText();
  expect(title).not.toBe("The Millrace Ultimatum");
  await expect(page.locator("#copy-markdown-btn")).toBeVisible();
  await expect(page.locator("#save-to-codex-btn")).toHaveCount(1);
  for (const width of [360, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Add to my Codex" }),
    ).toBeVisible();
  }
  await page.setViewportSize({ width: 1280, height: 844 });
  await page.getByRole("button", { name: "Add to my Codex" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: title, level: 2, exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole("dialog", { name: "What would you like to do first?" }),
  ).toHaveCount(0);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: `Selected ${title}, event, 0 connections.` }),
  ).toBeVisible();
  const gmNotes = page.getByTestId("entity-gm-notes");
  await expect(gmNotes).toBeVisible();
  const gmToggle = gmNotes.getByRole("button", { name: /GM notes/ });
  if ((await gmToggle.getAttribute("aria-expanded")) === "false") {
    await gmToggle.click();
  }
  await expect(gmNotes).toContainText("The Twist");
  await expect(gmNotes).toContainText("Complication");
  await expect(gmNotes).toContainText("Reward");
  await expect(page.getByTestId("entity-main-text")).not.toContainText(
    "The Twist",
  );
  // Record the first-run vault before a second import. The second result
  // should append to that very same vault, not create a new one.
  // A new document reads the persisted local vault; it is not merely a
  // pre-navigation draft or the importer's in-memory selection.
  await page.goto("/table");
  await expect(
    page.getByTestId("entity-table-row").filter({ hasText: title }),
  ).toBeVisible({ timeout: 30_000 });

  await page.goto("/generators/quest");
  await expect(
    page.getByRole("heading", { name: "The Millrace Ultimatum" }),
  ).toBeVisible();
  const secondToggle = page.locator("#ai-toggle");
  if ((await secondToggle.count()) && (await secondToggle.isChecked())) {
    await secondToggle.uncheck();
  }
  await page.click("#generate-button");
  await expect(
    page.getByTestId("generator-continuation-callout"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add to my Codex" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /Selected .+, event, 0 connections/ }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("goal-invitation")).toHaveCount(0);
  await page.goto("/table");
  await expect(page.getByTestId("entity-table-row")).toHaveCount(2, {
    timeout: 30_000,
  });
  await expect(
    page.getByTestId("entity-table-row").filter({ hasText: title }).first(),
  ).toBeVisible();
});

import { expect, test, type Page } from "@playwright/test";
import { seedEntity, setupVaultPage, waitForVaultReady } from "./test-helpers";

/**
 * Settings → Schema → Campaign Labels (#3771): Rename and Delete used to look
 * like they worked and did nothing. They now change every entry in the vault.
 */
test.describe.configure({ mode: "serial" });

const labelsOf = (page: Page, id: string) =>
  page.evaluate(
    (entityId) => (window as any).vault.entities[entityId]?.labels ?? null,
    id,
  );

async function seed(page: Page) {
  const a = await seedEntity(page, {
    type: "character",
    title: "Mira",
    data: { labels: ["npc", "quest"] },
  });
  const b = await seedEntity(page, {
    type: "character",
    title: "Bram",
    data: { labels: ["npc"] },
  });
  const c = await seedEntity(page, {
    type: "location",
    title: "Oakvale",
    data: { labels: ["place"] },
  });
  return { a, b, c };
}

async function openLabels(page: Page) {
  await page.getByTestId("settings-button").click();
  await page.getByRole("tab", { name: /schema/i }).click();
  await expect(page.getByText("Project Labels")).toBeVisible();
}

test.describe("Campaign Labels", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(90000);
    await setupVaultPage(page);
  });

  test("renaming a label changes it on every entry that has it", async ({
    page,
  }) => {
    const { a, b, c } = await seed(page);
    await openLabels(page);

    await page.getByRole("button", { name: "Rename npc label" }).click();
    await page.getByLabel("New name for the npc label").fill("Character");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(
      page.getByText('Renamed "npc" to "character" on 2 entries.'),
    ).toBeVisible();
    expect(await labelsOf(page, a)).toEqual(["character", "quest"]);
    expect(await labelsOf(page, b)).toEqual(["character"]);
    // An entry without the label is untouched.
    expect(await labelsOf(page, c)).toEqual(["place"]);
    // The list itself follows.
    await expect(
      page.getByRole("button", { name: "Rename character label" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Rename npc label" }),
    ).toHaveCount(0);
  });

  test("a rename is saved, so it is still there after a reload", async ({
    page,
  }) => {
    const { a, b } = await seed(page);
    await openLabels(page);
    await page.getByRole("button", { name: "Rename npc label" }).click();
    await page.getByLabel("New name for the npc label").fill("hero");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(
      page.getByText('Renamed "npc" to "hero" on 2 entries.'),
    ).toBeVisible();
    // Give the save queue a moment to write to disk before leaving.
    await expect.poll(() => labelsOf(page, a)).toEqual(["hero", "quest"]);
    await page.waitForTimeout(1500);

    await page.reload();
    await waitForVaultReady(page);

    await expect
      .poll(() => labelsOf(page, a), { timeout: 15000 })
      .toEqual(["hero", "quest"]);
    expect(await labelsOf(page, b)).toEqual(["hero"]);
  });

  test("renaming into an existing label asks first and merges without duplicates", async ({
    page,
  }) => {
    const { a, b } = await seed(page);
    await openLabels(page);

    await page.getByRole("button", { name: "Rename npc label" }).click();
    await page.getByLabel("New name for the npc label").fill("quest");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(
      page.getByText(/A label named "quest" already exists/),
    ).toBeVisible();
    await page.getByRole("button", { name: "Merge", exact: true }).click();

    await expect.poll(() => labelsOf(page, a)).toEqual(["quest"]);
    expect(await labelsOf(page, b)).toEqual(["quest"]);
  });

  test("deleting a label removes it everywhere but keeps the entries", async ({
    page,
  }) => {
    const { a, b, c } = await seed(page);
    await openLabels(page);

    await page
      .getByRole("button", { name: "Delete npc label project-wide" })
      .click();
    await expect(
      page.getByText(
        'Remove the label "npc" from 2 entries? The entries themselves are not deleted.',
      ),
    ).toBeVisible();
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await expect.poll(() => labelsOf(page, a)).toEqual(["quest"]);
    expect(await labelsOf(page, b)).toEqual([]);
    expect(await labelsOf(page, c)).toEqual(["place"]);
    // Nobody lost an entry.
    for (const id of [a, b, c]) expect(await labelsOf(page, id)).not.toBeNull();
  });

  test("cancelling a delete changes nothing", async ({ page }) => {
    const { a } = await seed(page);
    await openLabels(page);

    await page
      .getByRole("button", { name: "Delete npc label project-wide" })
      .click();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();

    expect(await labelsOf(page, a)).toEqual(["npc", "quest"]);
    await expect(
      page.getByRole("button", { name: "Rename npc label" }),
    ).toBeVisible();
  });
});

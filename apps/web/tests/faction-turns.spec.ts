import { test, expect } from "@playwright/test";
import {
  openEntitySidepanel,
  seedEntity,
  setupVaultPage,
} from "./test-helpers";

/**
 * End-to-end cover for the Faction Turn slice (feature 161).
 *
 * The unit suites already prove the mechanics in isolation. What they cannot
 * prove is that the whole chain holds together against a real vault: that
 * opting in persists, that a preview writes nothing, that committing actually
 * moves the stat and the relationship, and that undo puts them back.
 *
 * Most of this feature's requirements are of the form "nothing was written" or
 * "everything was restored", and those are exactly the ones that pass in a unit
 * test while failing against real storage.
 */
test.describe("Faction turns", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  /** A faction with one numeric stat, plus a target to act on. */
  async function seedWorld(page: Parameters<typeof seedEntity>[0]) {
    const factionId = await seedEntity(page, {
      title: "Black Eagles",
      type: "faction",
      content: "Mercenaries of the northern lakes.",
      data: {
        statSheet: {
          fields: [
            {
              id: "fld_influence",
              label: "Political Reach",
              type: "number",
              value: 6,
            },
          ],
        },
      },
    });

    await seedEntity(page, {
      title: "Mub Territory",
      type: "location",
      content: "A contested march.",
    });

    // A current world date. Without one the feature correctly refuses to act,
    // and it must never fall back to the real-world clock (FR-008a).
    const currentDateId = await seedEntity(page, {
      title: "Current date",
      type: "event",
      data: { date: { year: 640, month: 3, day: 12 } },
    });

    // The shared timeline store resolves its marker during vault startup. This
    // fixture adds entities after startup, so mirror the resolved marker that a
    // vault containing this event at load time would already provide.
    await page.evaluate((entityId) => {
      (window as any).calendarStore.calendarCurrentDate = {
        source: "entity",
        date: { year: 640, month: 3, day: 12 },
        entityId,
      };
    }, currentDateId);

    return factionId;
  }

  async function openTurnsTab(
    page: Parameters<typeof seedEntity>[0],
    id: string,
  ) {
    await openEntitySidepanel(page, id);
    const panel = page.getByTestId("entity-detail-panel");
    await expect(panel).toBeVisible();
    await panel.getByTestId("tab-faction").click();
    return panel;
  }

  test("a faction can opt in, act, and have the result recorded", async ({
    page,
  }) => {
    const factionId = await seedWorld(page);
    await openTurnsTab(page, factionId);

    await page.getByRole("button", { name: "Turn on faction turns" }).click();

    // Map the one role Influence needs. The others stay unset on purpose —
    // requiring all four would block a GM who never modelled military power.
    await page
      .getByLabel("Stat for Influence")
      .selectOption({ label: "Political Reach (6)" });

    await page
      .getByLabel("Target", { exact: true })
      .selectOption({ label: "Mub Territory" });
    await page.getByTestId("faction-take-turn").click();

    // Preview appears, and nothing has been written yet.
    const preview = page.getByTestId("faction-turn-preview");
    await expect(preview).toBeVisible();
    await expect(preview).toContainText("Nothing saved yet");

    // The working must be inspectable — an outcome a GM cannot interrogate is
    // one they cannot decide whether to trust (FR-018).
    await page.getByRole("button", { name: "Show the working" }).click();
    await expect(preview).toContainText("Political Reach");
    await expect(preview).toContainText("Why they resist");

    await page.getByTestId("faction-commit").click();
    await expect(preview).toBeHidden();

    // The turn is now in durable faction history.
    await page.waitForFunction((id) => {
      const history = (window as any).vault?.entities?.[id]?.factionTurn
        ?.history;
      return (
        history?.length === 1 && history[0]?.targetTitle === "Mub Territory"
      );
    }, factionId);
  });

  test("discarding a preview leaves the faction untouched", async ({
    page,
  }) => {
    const factionId = await seedWorld(page);
    await openTurnsTab(page, factionId);

    await page.getByRole("button", { name: "Turn on faction turns" }).click();
    await page
      .getByLabel("Stat for Influence")
      .selectOption({ label: "Political Reach (6)" });

    const before = await page.evaluate((id) => {
      const vault = (window as any).vault;
      return JSON.stringify({
        stat: vault.entities[id].statSheet?.fields,
        connections: vault.entities[id].connections,
        history: vault.entities[id].factionTurn?.history ?? [],
      });
    }, factionId);

    await page
      .getByLabel("Target", { exact: true })
      .selectOption({ label: "Mub Territory" });
    await page.getByTestId("faction-take-turn").click();
    await expect(page.getByTestId("faction-turn-preview")).toBeVisible();

    await page.getByRole("button", { name: "Throw it away" }).click();

    const after = await page.evaluate((id) => {
      const vault = (window as any).vault;
      return JSON.stringify({
        stat: vault.entities[id].statSheet?.fields,
        connections: vault.entities[id].connections,
        history: vault.entities[id].factionTurn?.history ?? [],
      });
    }, factionId);

    expect(after).toBe(before);
  });

  test("undo restores the stat and the relationship exactly", async ({
    page,
  }) => {
    const factionId = await seedWorld(page);
    await openTurnsTab(page, factionId);

    await page.getByRole("button", { name: "Turn on faction turns" }).click();
    await page
      .getByLabel("Stat for Influence")
      .selectOption({ label: "Political Reach (6)" });

    const snapshot = async () =>
      page.evaluate((id) => {
        const vault = (window as any).vault;
        const e = vault.entities[id];
        return JSON.stringify({
          fields: e.statSheet?.fields,
          connections: e.connections ?? [],
        });
      }, factionId);

    const before = await snapshot();

    await page
      .getByLabel("Target", { exact: true })
      .selectOption({ label: "Mub Territory" });
    await page.getByTestId("faction-take-turn").click();
    await page.getByTestId("faction-commit").click();

    // Commit clears the preview just before its final busy-state cleanup.
    // Let that cleanup settle before exercising the next independent action.
    await page.waitForTimeout(50);
    await expect(page.getByTestId("faction-undo")).toBeVisible();
    await page.getByTestId("faction-undo").click();

    await page.waitForFunction(
      (id) =>
        (window as any).vault?.entities?.[id]?.factionTurn?.history?.[0]
          ?.undone === true,
      factionId,
    );
    expect(await snapshot()).toBe(before);
  });

  test("the campaign's current date is never modified", async ({ page }) => {
    // The feature's headline promise (FR-006, SC-003). A regression here would
    // be invisible until a GM noticed their campaign year had drifted.
    const factionId = await seedWorld(page);
    await openTurnsTab(page, factionId);

    const calendarBefore = await page.evaluate(() =>
      JSON.stringify((window as any).calendarStore?.config ?? null),
    );

    await page.getByRole("button", { name: "Turn on faction turns" }).click();
    await page
      .getByLabel("Stat for Influence")
      .selectOption({ label: "Political Reach (6)" });
    await page
      .getByLabel("Target", { exact: true })
      .selectOption({ label: "Mub Territory" });
    await page.getByTestId("faction-take-turn").click();
    await page.getByTestId("faction-commit").click();

    const calendarAfter = await page.evaluate(() =>
      JSON.stringify((window as any).calendarStore?.config ?? null),
    );
    expect(calendarAfter).toBe(calendarBefore);
  });

  test("a faction that has not opted in shows no turn controls", async ({
    page,
  }) => {
    // FR-002 / SC-008: an untouched vault must look exactly as it did before
    // this feature existed.
    const factionId = await seedWorld(page);
    await openTurnsTab(page, factionId);

    await expect(
      page.getByRole("button", { name: "Turn on faction turns" }),
    ).toBeVisible();
    await expect(page.getByTestId("faction-take-turn")).toBeHidden();
    await expect(page.getByLabel("Stat for Influence")).toBeHidden();
  });

  test("a non-faction entity has no Turns tab at all", async ({ page }) => {
    const noteId = await seedEntity(page, {
      title: "Just A Note",
      type: "note",
    });
    await openEntitySidepanel(page, noteId);
    const panel = page.getByTestId("entity-detail-panel");
    await expect(panel).toBeVisible();
    await expect(panel.getByTestId("tab-faction")).toHaveCount(0);
  });
});

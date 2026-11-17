import { test, expect, type Page } from "@playwright/test";
import { seedEntity, setupVaultPage } from "./test-helpers";

async function openStats(page: Page, id: string) {
  await page.evaluate((entityId) => {
    (window as any).vault.selectedEntityId = entityId;
  }, id);
  await page
    .getByTestId("entity-detail-panel")
    .getByTestId("tab-stats")
    .click();
  return page
    .getByTestId("entity-detail-panel")
    .getByTestId("detail-stats-tab");
}
async function stored(page: Page, id: string) {
  return page.evaluate(
    (entityId) =>
      JSON.parse(JSON.stringify((window as any).vault.entities[entityId])),
    id,
  );
}

test("Creature authoring and Character/NPC selection preserve bases through edits, reload and missing sources", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await setupVaultPage(page);
  const vaultId = await page.evaluate(async () => {
    const vault = (window as any).vault;
    const foreign = await vault.createVault("Foreign species");
    await vault.switchVault(foreign);
    await vault.createEntity("creature", "Foreign species", {
      speciesDefinition: { kind: "species", version: 1, traits: [] },
    });
    const local = await vault.createVault("Species journey");
    await vault.switchVault(local);
    return local;
  });
  const sourceId = await seedEntity(page, {
    type: "creature",
    title: "Kethari",
  });
  await seedEntity(page, { type: "creature", title: "Undesignated" });
  let stats = await openStats(page, sourceId);
  await stats
    .getByRole("button", { name: "Designate Species/Ancestry" })
    .click();
  for (const [i, name, description, key, amount] of [
    [1, "Powerful", "Strong", "strength", "2"],
    [2, "Reserved", "Quiet", "presence", "-1"],
    [3, "Night sight", "See in darkness", "", ""],
  ] as const) {
    await stats.getByRole("button", { name: "Add trait", exact: true }).click();
    await stats.getByLabel(`Trait name ${i}`, { exact: true }).fill(name);
    await stats
      .getByLabel(`Description ${i}`, { exact: true })
      .fill(description);
    if (key) {
      await stats
        .getByRole("button", { name: `Add adjustment ${i}`, exact: true })
        .click();
      await stats.getByLabel(`Target key ${i}.1`).fill(key);
      await stats.getByLabel(`Amount ${i}.1`).fill(amount);
    }
  }
  await stats.getByRole("button", { name: "Save species definition" }).click();
  await expect(stats.getByText(/Designated Creature/)).toBeVisible();
  await page.reload();
  await page.waitForFunction(
    (id) => (window as any).vault?.entities[id]?.speciesDefinition,
    sourceId,
  );
  expect((await stored(page, sourceId)).speciesDefinition.traits).toHaveLength(
    3,
  );

  const ids: string[] = [];
  for (const type of ["character", "npc"]) {
    const id = await seedEntity(page, {
      type,
      title: `Traveller ${type}`,
      content: "Manual abilities and notes",
      data: {
        connections: [{ target: sourceId, type: "knows" }],
        statSheet: {
          templateId: null,
          fields: [
            {
              id: "might",
              key: "strength",
              label: "Might",
              type: "number",
              value: 10,
            },
            {
              id: "charm",
              key: "presence",
              label: "Charm",
              type: "number",
              value: 8,
            },
            {
              id: "notes",
              label: "Manual ability",
              type: "text",
              value: "Sailing",
            },
          ],
        },
      },
    });
    ids.push(id);
    stats = await openStats(page, id);
    const before = await stored(page, id);
    await stats
      .getByRole("button", { name: "Choose Species/Ancestry" })
      .click();
    const review = stats.getByRole("dialog", {
      name: "Review Species/Ancestry",
    });
    const picker = review.getByRole("combobox");
    await expect(
      picker.getByRole("option", { name: "Undesignated" }),
    ).toHaveCount(0);
    await expect(
      picker.getByRole("option", { name: "Foreign species" }),
    ).toHaveCount(0);
    await picker.selectOption(sourceId);
    await expect(review.getByText(/Base 10; Effective 12/)).toBeVisible();
    await expect(review.getByText(/Base 8; Effective 7/)).toBeVisible();
    await expect(review.getByText("Night sight")).toBeVisible();
    expect(await stored(page, id)).toEqual(before);
    await picker.press("Escape");
    await expect(
      stats.getByRole("button", { name: "Choose Species/Ancestry" }),
    ).toBeFocused();
    expect(await stored(page, id)).toEqual(before);
    await stats
      .getByRole("button", { name: "Choose Species/Ancestry" })
      .click();
    await stats.getByRole("combobox").selectOption(sourceId);
    await stats
      .getByRole("button", { name: "Confirm species selection" })
      .click();
    await expect(stats.getByRole("dialog")).toHaveCount(0);
    expect(
      (await stored(page, id)).statSheet.fields.map(
        (field: any) => field.value,
      ),
    ).toEqual([10, 8, "Sailing"]);
    await stats
      .getByRole("spinbutton", { name: "Might", exact: true })
      .fill("13");
    await expect(
      stats.getByTestId("species-number").filter({ hasText: "Powerful" }),
    ).toContainText("Base 13; Effective 15");
    await page.evaluate(async () => (window as any).vault.flushPendingSaves());
    // Re-selection preserves the original snapshot and contributes once.
    const applied = (await stored(page, id)).appliedSpecies;
    await stats
      .getByRole("button", { name: "Choose Species/Ancestry" })
      .click();
    await stats
      .getByRole("button", { name: "Confirm species selection" })
      .click();
    expect((await stored(page, id)).appliedSpecies).toEqual(applied);
    expect((await stored(page, id)).connections).toEqual(before.connections);
  }
  await page.evaluate(async (id) => {
    const vault = (window as any).vault;
    await vault.updateEntity(id, { speciesDefinition: undefined });
    await vault.deleteEntity(id);
  }, sourceId);
  stats = await openStats(page, ids[0]);
  await expect(stats.getByText(/Source Creature unavailable/)).toBeVisible();
  await expect(
    stats.getByRole("button", { name: "Open source Creature" }),
  ).toHaveCount(0);
  await expect(stats.getByText("Powerful")).toBeVisible();
  const replacement = await seedEntity(page, {
    type: "creature",
    title: "Other species",
    data: {
      speciesDefinition: {
        kind: "species",
        version: 1,
        traits: [
          {
            id: "slight",
            name: "Slight",
            description: "Light frame",
            adjustments: [{ key: "strength", amount: -1 }],
          },
        ],
      },
    },
  });
  stats = await openStats(page, ids[0]);
  await stats.getByRole("button", { name: "Choose Species/Ancestry" }).click();
  await stats.getByRole("combobox").selectOption(replacement);
  await expect(
    stats.getByRole("dialog").getByText(/Base 13; Effective 12/),
  ).toBeVisible();
  await stats
    .getByRole("button", { name: "Confirm species selection" })
    .click();
  await expect(stats.getByRole("dialog")).toHaveCount(0);
  await stats.getByRole("button", { name: "Choose Species/Ancestry" }).click();
  await stats.getByRole("combobox").selectOption("");
  await stats
    .getByRole("button", { name: "Confirm species selection" })
    .click();
  await expect(stats.getByText("No Species/Ancestry selected.")).toBeVisible();
  const removed = await stored(page, ids[0]);
  expect(removed.statSheet.fields.map((field: any) => field.value)).toEqual([
    13,
    8,
    "Sailing",
  ]);
  expect(removed.content).toBe("Manual abilities and notes");
  await page.reload();
  await page.waitForFunction(
    (id) => (window as any).vault?.entities[id]?.appliedSpecies,
    ids[1],
  );
  expect(await page.evaluate(() => (window as any).vault.activeVaultId)).toBe(
    vaultId,
  );
  expect((await stored(page, ids[1])).appliedSpecies.source.title).toBe(
    "Kethari",
  );
});

test("a rejected species save retains the previous snapshot, retries once and respects guest mode", async ({
  page,
}) => {
  await setupVaultPage(page);
  const sourceId = await seedEntity(page, {
    type: "creature",
    title: "Retry species",
    data: {
      speciesDefinition: {
        kind: "species",
        version: 1,
        traits: [
          {
            id: "power",
            name: "Powerful",
            description: "Strong",
            adjustments: [{ key: "strength", amount: 2 }],
          },
        ],
      },
    },
  });
  const heroId = await seedEntity(page, {
    type: "character",
    title: "Retry hero",
    data: {
      statSheet: {
        templateId: null,
        fields: [
          {
            id: "a",
            key: "strength",
            label: "Might",
            type: "number",
            value: 10,
          },
        ],
      },
    },
  });
  const stats = await openStats(page, heroId);
  const opener = stats.getByRole("button", { name: "Choose Species/Ancestry" });
  await opener.focus();
  await opener.press("Enter");
  await stats.getByRole("combobox").selectOption(sourceId);
  await stats
    .getByRole("button", { name: "Confirm species selection" })
    .click();
  await expect(stats.getByRole("dialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
  const before = await stored(page, heroId);
  await page.evaluate(async () => {
    const modulePath = "/src/lib/services/species-persistence.ts";
    const { speciesPersistence } = await import(/* @vite-ignore */ modulePath);
    const save = speciesPersistence.save.bind(speciesPersistence);
    let reject = true;
    speciesPersistence.save = async (id: string, patch: any) => {
      if (reject) {
        reject = false;
        throw new Error("Simulated disk failure");
      }
      return save(id, patch);
    };
  });
  await opener.click();
  await stats.getByRole("combobox").selectOption("");
  await stats
    .getByRole("button", { name: "Confirm species selection" })
    .click();
  await expect(stats.getByRole("alert")).toContainText(
    "Simulated disk failure",
  );
  expect(await stored(page, heroId)).toEqual(before);
  await stats
    .getByRole("button", { name: "Confirm species selection" })
    .click();
  await expect(stats.getByRole("dialog")).toHaveCount(0);
  expect((await stored(page, heroId)).appliedSpecies).toBeUndefined();
  expect((await stored(page, heroId)).statSheet.fields[0].value).toBe(10);
  const readOnlyBefore = await stored(page, heroId);
  await page.evaluate(async () => {
    const modulePath = "/src/lib/stores/ui/session-mode.svelte.ts";
    const { sessionModeStore } = await import(/* @vite-ignore */ modulePath);
    sessionModeStore.isGuestMode = true;
  });
  await expect(opener).toHaveCount(0);
  expect(await stored(page, heroId)).toEqual(readOnlyBefore);
});

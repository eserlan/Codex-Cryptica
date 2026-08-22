import { test, expect } from "@playwright/test";

/**
 * T055 — the quickstart walk: an entity leaves one vault and arrives complete
 * in another.
 *
 * This is the assertion SC-002 actually makes, and the one no unit test can
 * make on its own: the package is exercised against in-memory fakes, and the
 * adapter tests stub OPFS. Only here do the real OPFS reads and writes, the
 * real IndexedDB shelf, the vault's own `stringifyEntity`, and the panel UI
 * run together against two real vaults.
 *
 * Both halves are driven through the app's shelf module rather than its UI:
 * the workspace chrome does not mount on this route in the harness, so neither
 * the activity bar nor the sidebar host renders. That is a limit of the
 * harness, not of the feature — the panel's own behaviour is covered by
 * ShelfPanel.test.ts, and what only this test can reach is the real storage
 * underneath it.
 */

const SHELF_MODULE_PATH = ["/src/lib/features/shelf", "index.ts"].join("/");

/**
 * `isInitialized` is the gate that matters before creating vaults: it is what
 * signals the OPFS storage root is ready. Waiting only for an idle status
 * fails with "Storage not initialized", because idle is reachable first.
 */
async function waitForVaultReady(page: import("@playwright/test").Page) {
  await page.waitForFunction(
    () => (window as any).vault?.isInitialized === true,
    { timeout: 30000 },
  );
}

async function waitForVaultIdle(page: import("@playwright/test").Page) {
  await page.waitForFunction(() => (window as any).vault?.status === "idle", {
    timeout: 30000,
  });
}

test.describe("Shelf — carrying an entity between vaults", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );
    });
  });

  test("an entity shelved in one vault arrives complete in another", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForVaultReady(page);

    // --- Vault A, with one fully authored creature -------------------------

    const vaultAId = await page.evaluate(
      async () => await (window as any).vault.createVault("Shelf Source"),
    );
    await page.evaluate(
      async (id) => await (window as any).vault.switchVault(id),
      vaultAId,
    );
    await waitForVaultIdle(page);

    await page.evaluate(async () => {
      await (window as any).vault.createEntity("creature", "Cinder Hound", {
        content: "It smells of hot iron.",
        lore: "Bred in the forge-pits.",
        labels: ["hostile", "fire"],
        aliases: ["Ashhound"],
        statSheet: {
          templateId: null,
          fields: [
            { id: "hp", label: "HP", type: "number", value: 22 },
            { id: "ac", label: "AC", type: "number", value: 14 },
          ],
        },
      });
    });
    await waitForVaultIdle(page);

    const shelved = await page.evaluate(async (modulePath) => {
      const module = await import(/* @vite-ignore */ modulePath);
      const vault = (window as any).vault;
      const entity = Object.values(vault.entities).find(
        (e: any) => e.title === "Cinder Hound",
      ) as { id: string };
      const ok = await module.shelf.shelve([entity.id], vault.vaultName);
      await module.shelf.refresh();
      return { ok, count: module.shelf.entries.length };
    }, SHELF_MODULE_PATH);

    expect(shelved.ok).toBe(true);
    expect(shelved.count).toBe(1);

    // --- Vault B, empty ----------------------------------------------------

    const vaultBId = await page.evaluate(
      async () => await (window as any).vault.createVault("Shelf Target"),
    );
    await page.evaluate(
      async (id) => await (window as any).vault.switchVault(id),
      vaultBId,
    );
    await waitForVaultIdle(page);

    // The Shelf is origin-level: its contents survive the vault switch.
    const listed = await page.evaluate(async (modulePath) => {
      const module = await import(/* @vite-ignore */ modulePath);
      await module.shelf.refresh();
      return module.shelf.entries.map((e: any) => ({
        title: e.title,
        sourceVaultName: e.sourceVaultName,
      }));
    }, SHELF_MODULE_PATH);

    expect(listed).toEqual([
      { title: "Cinder Hound", sourceVaultName: "Shelf Source" },
    ]);

    // --- Import ------------------------------------------------------------
    //
    // Driven through the shelf module rather than the panel: the workspace
    // chrome does not mount on this route in the harness, so neither the
    // activity bar nor the sidebar host renders. Panel behaviour — selection,
    // the disabled import button, the empty state, ordering — is covered by
    // ShelfPanel.test.ts. What only this test can reach is the real OPFS and
    // IndexedDB path underneath, which is the substance of SC-002.
    const outcome = await page.evaluate(async (modulePath) => {
      const module = await import(/* @vite-ignore */ modulePath);
      const entryId = module.shelf.entries[0].id;
      const plan = await module.shelf.plan([entryId]);
      const ok = await module.shelf.import(plan);
      await module.shelf.refresh();
      return {
        ok,
        error: module.shelf.error,
        created: module.shelf.lastOutcome?.created ?? [],
        renamed: module.shelf.lastOutcome?.renamed ?? [],
        entriesAfter: module.shelf.entries.length,
      };
    }, SHELF_MODULE_PATH);

    expect(outcome.error).toBeNull();
    expect(outcome.ok).toBe(true);
    expect(outcome.created).toHaveLength(1);
    expect(outcome.created[0].title).toBe("Cinder Hound");
    expect(outcome.renamed).toEqual([]);
    // Importing does not consume the entry (FR-021).
    expect(outcome.entriesAfter).toBe(1);

    // --- What actually landed ---------------------------------------------

    const imported = await page.evaluate(() => {
      const vault = (window as any).vault;
      const entity = Object.values(vault.entities).find(
        (e: any) => e.title === "Cinder Hound",
      ) as any;
      if (!entity) return null;
      return {
        title: entity.title,
        type: entity.type,
        lore: entity.lore,
        labels: entity.labels,
        aliases: entity.aliases,
        statFields: entity.statSheet?.fields?.map((f: any) => [f.id, f.value]),
        vaultId: vault.activeVaultId,
      };
    });

    expect(imported).not.toBeNull();
    expect(imported!.vaultId).toBe(vaultBId);
    expect(imported!.type).toBe("creature");
    expect(imported!.lore).toBe("Bred in the forge-pits.");
    expect(imported!.aliases).toEqual(["Ashhound"]);
    expect(imported!.labels).toEqual(
      expect.arrayContaining(["hostile", "fire"]),
    );
    // The stat sheet is the reason this feature exists (#2101).
    expect(imported!.statFields).toEqual([
      ["hp", 22],
      ["ac", 14],
    ]);
  });

  test("the source vault is untouched by shelving (FR-010)", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForVaultReady(page);

    const vaultId = await page.evaluate(
      async () => await (window as any).vault.createVault("Untouched"),
    );
    await page.evaluate(
      async (id) => await (window as any).vault.switchVault(id),
      vaultId,
    );
    await waitForVaultIdle(page);

    await page.evaluate(async () => {
      await (window as any).vault.createEntity("npc", "Quill", {
        content: "A scribe.",
      });
    });
    await waitForVaultIdle(page);

    const snapshot = () =>
      page.evaluate(() =>
        JSON.stringify(
          Object.values((window as any).vault.entities).map((e: any) => [
            e.id,
            e.title,
            e.content,
            e.updatedAt,
          ]),
        ),
      );

    const before = await snapshot();

    await page.evaluate(async (modulePath) => {
      const module = await import(/* @vite-ignore */ modulePath);
      const vault = (window as any).vault;
      const entity = Object.values(vault.entities).find(
        (e: any) => e.title === "Quill",
      ) as { id: string };
      await module.shelf.shelve([entity.id], vault.vaultName);
    }, SHELF_MODULE_PATH);

    expect(await snapshot()).toBe(before);
  });
});

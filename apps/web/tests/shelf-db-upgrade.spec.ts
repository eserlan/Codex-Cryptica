import { test, expect } from "@playwright/test";

/**
 * T006 — the v22 → v23 upgrade that adds the Shelf's two object stores.
 *
 * This is the one step in 156-entity-shelf whose failure mode is other
 * people's data: everybody who already uses Codex Cryptica has a populated
 * v22 database, and it is upgraded in place the first time they load a build
 * carrying this change. A unit test against a fresh `fake-indexeddb` proves
 * nothing about that, because the interesting case is precisely the one where
 * data already exists.
 *
 * So this test builds a real v22 database with real records in it, loads the
 * app on top, and checks that the upgrade added what it should and touched
 * nothing else.
 *
 * The `idb.ts` version history also records that version 20 was consumed as a
 * no-op in some browsers during development, which is why the upgrade callback
 * guards every `createObjectStore` with a `contains` check rather than
 * assuming a clean run. The last case below covers a re-upgrade.
 */

const DB_NAME = "CodexCryptica";

/** Stores as they existed at v22, before the Shelf. */
const V22_STORES = [
  { name: "settings", options: {} },
  { name: "vault_cache", options: { keyPath: "path" } },
  { name: "chat_history", options: { keyPath: "id" } },
  { name: "world_eras", options: { keyPath: "id" } },
  { name: "vaults", options: { keyPath: "id" } },
  {
    name: "stat_sheet_templates",
    options: { keyPath: "id" },
    index: "by-vault",
  },
  {
    name: "stat_sheet_presentation_templates",
    options: { keyPath: "id" },
    index: "by-vault",
  },
];

/**
 * Deletes whatever the app just created and rebuilds a populated v22 database
 * in its place, so the reload that follows performs a genuine in-place upgrade.
 */
async function seedV22Database(page: import("@playwright/test").Page) {
  return page.evaluate(
    async ({ dbName, stores }) => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(dbName);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => resolve();
      });

      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName, 22);
        request.onupgradeneeded = () => {
          const upgrading = request.result;
          for (const store of stores) {
            const objectStore = upgrading.createObjectStore(
              store.name,
              store.options as IDBObjectStoreParameters,
            );
            if (store.index) objectStore.createIndex(store.index, "vaultId");
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(
          ["vaults", "stat_sheet_templates", "settings"],
          "readwrite",
        );
        tx.objectStore("vaults").put({
          id: "vault-from-before",
          name: "A vault that predates the Shelf",
          createdAt: 1,
          lastOpenedAt: 2,
          entityCount: 37,
        });
        tx.objectStore("stat_sheet_templates").put({
          id: "tpl-from-before",
          vaultId: "vault-from-before",
          name: "Monster",
          fields: [{ id: "hp", label: "HP", type: "number" }],
        });
        tx.objectStore("settings").put("a-preserved-setting", "someKey");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      db.close();
    },
    { dbName: DB_NAME, stores: V22_STORES },
  );
}

async function inspectDatabase(page: import("@playwright/test").Page) {
  return page.evaluate(async (dbName) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const read = <T>(store: string, key: IDBValidKey) =>
      new Promise<T | undefined>((resolve, reject) => {
        const request = db.transaction(store).objectStore(store).get(key);
        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () => reject(request.error);
      });

    const shelfIndexes = db.objectStoreNames.contains("shelf_entries")
      ? [
          ...db.transaction("shelf_entries").objectStore("shelf_entries")
            .indexNames,
        ]
      : [];

    const result = {
      version: db.version,
      storeNames: [...db.objectStoreNames].sort(),
      shelfIndexes,
      vault: await read<{ name: string; entityCount: number }>(
        "vaults",
        "vault-from-before",
      ),
      template: await read<{ name: string }>(
        "stat_sheet_templates",
        "tpl-from-before",
      ),
      setting: await read<string>("settings", "someKey"),
    };

    db.close();
    return result;
  }, DB_NAME);
}

/**
 * Opens the database through the app's own `getDB()`, which is what carries the
 * upgrade callback under test.
 *
 * Waiting for the vault to go idle is not enough on its own: OPFS is
 * unavailable in the Playwright sandbox, so vault initialisation short-circuits
 * and may never reach the code that opens IndexedDB. Calling `getDB()` directly
 * exercises the real upgrade path rather than a reimplementation of it — the
 * same approach cache-persistence.spec.ts takes with CacheService.
 *
 * The path is assembled at runtime so tsc does not try to resolve a
 * Vite-served browser URL as a module specifier.
 */
const IDB_MODULE_PATH = ["/src/lib/utils", "idb.ts"].join("/");

async function openThroughApp(page: import("@playwright/test").Page) {
  await page.waitForFunction(
    () => (window as { vault?: unknown }).vault !== undefined,
    { timeout: 20000 },
  );
  await page.evaluate(async (modulePath) => {
    const module = await import(/* @vite-ignore */ modulePath);
    const db = await module.getDB();
    return db.version;
  }, IDB_MODULE_PATH);
}

test.describe("Shelf — IndexedDB v22 to v23 upgrade", () => {
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

  test("adds the Shelf stores to a populated database without disturbing it", async ({
    page,
  }) => {
    await page.goto("/");
    await openThroughApp(page);

    await seedV22Database(page);

    // Reload so the app opens the seeded v22 database and upgrades it in place.
    await page.reload();
    await openThroughApp(page);

    const after = await inspectDatabase(page);

    expect(after.version).toBe(23);

    // The new stores exist, with the index the by-group lookup depends on.
    expect(after.storeNames).toContain("shelf_entries");
    expect(after.storeNames).toContain("shelf_journal");
    expect(after.shelfIndexes).toContain("by-group");

    // Nothing that was already there has been dropped or altered. This is the
    // assertion the whole test exists for.
    expect(after.storeNames).toEqual(
      expect.arrayContaining(V22_STORES.map((s) => s.name)),
    );
    expect(after.vault?.name).toBe("A vault that predates the Shelf");
    expect(after.vault?.entityCount).toBe(37);
    expect(after.template?.name).toBe("Monster");
    expect(after.setting).toBe("a-preserved-setting");
  });

  test("is idempotent when the app reloads against an already-upgraded database", async ({
    page,
  }) => {
    // The upgrade callback guards every createObjectStore with a `contains`
    // check, because idb.ts records a version that was consumed as a no-op in
    // some browsers. A second pass must neither throw nor recreate anything.
    await page.goto("/");
    await openThroughApp(page);

    await seedV22Database(page);
    await page.reload();
    await openThroughApp(page);

    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.reload();
    await openThroughApp(page);

    const after = await inspectDatabase(page);

    expect(after.version).toBe(23);
    expect(after.vault?.entityCount).toBe(37);
    expect(
      errors.filter((message) => /IndexedDB|object store/i.test(message)),
    ).toEqual([]);
  });
});

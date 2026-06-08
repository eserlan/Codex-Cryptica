import { test, expect } from "@playwright/test";

/**
 * End-to-end regression for the CacheService write path.
 *
 * Guards against regressions in the $state.snapshot() change (perf/983)
 * that removed the redundant JSON.parse/JSON.stringify wrapper. If
 * $state.snapshot() produces a non-serializable value that Dexie's
 * structured clone rejects, these writes would throw and data would not
 * survive a page reload.
 *
 * Approach: directly invoke CacheService.set / bulkSet via the app's
 * exposed globals, then reload and read back via CacheService.get.
 * This bypasses OPFS (unavailable in the Playwright sandbox) while still
 * exercising the real Dexie + $state.snapshot() code path.
 *
 * The dynamic import path below is a Vite-resolved browser URL, not a
 * TypeScript module path — tsc never executes page.evaluate() callbacks.
 * We use a runtime variable to prevent tsc from treating the string as a
 * module specifier and emitting a "Cannot find module" error.
 */

// Stored in a variable so tsc doesn't try to resolve it as a module path.
// Vite resolves this correctly at runtime inside page.evaluate().
const CACHE_SERVICE_PATH = ["/src/lib/services", "cache.svelte.ts"].join("/");

async function waitForVaultIdle(page: any) {
  await page.waitForFunction(
    () =>
      (window as any).vault !== undefined &&
      (window as any).vault.status === "idle",
    { timeout: 15000 },
  );
}

test.describe("CacheService persistence (set + bulkSet)", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );
    });

    await page.goto("/");
    await waitForVaultIdle(page);
  });

  test("CacheService.set() writes survive a page reload", async ({ page }) => {
    const vaultId = `e2e-vault-${Date.now()}`;
    const entityId = `e2e-entity-${Date.now()}`;
    const path = `${vaultId}:${entityId}.md`;

    const entity = {
      id: entityId,
      title: "Persist Test Entity",
      type: "npc",
      content: "Some content",
      lore: "",
      tags: [],
      labels: ["important"],
      aliases: [],
      connections: [],
      updatedAt: Date.now(),
      status: "active",
      _path: [`${entityId}.md`],
    };

    const writeResult = await page.evaluate(
      async ({
        p,
        e,
        modulePath,
      }: {
        p: string;
        e: any;
        modulePath: string;
      }) => {
        try {
          const { cacheService } = await import(modulePath);
          await cacheService.set(p, Date.now(), e);
          return { ok: true, error: null };
        } catch (err: any) {
          return { ok: false, error: err?.message ?? String(err) };
        }
      },
      { p: path, e: entity, modulePath: CACHE_SERVICE_PATH },
    );

    expect(writeResult.error).toBeNull();
    expect(writeResult.ok).toBe(true);

    await page.reload();
    await waitForVaultIdle(page);

    const readResult = await page.evaluate(
      async ({ p, modulePath }: { p: string; modulePath: string }) => {
        try {
          const { cacheService } = await import(modulePath);
          const hit = await cacheService.get(p);
          return {
            title: hit?.entity?.title ?? null,
            labels: hit?.entity?.labels ?? null,
            error: null,
          };
        } catch (err: any) {
          return {
            title: null,
            labels: null,
            error: err?.message ?? String(err),
          };
        }
      },
      { p: path, modulePath: CACHE_SERVICE_PATH },
    );

    expect(readResult.error).toBeNull();
    expect(readResult.title).toBe("Persist Test Entity");
    expect(readResult.labels).toContain("important");
  });

  test("CacheService.bulkSet() writes survive a page reload", async ({
    page,
  }) => {
    const ts = Date.now();
    const vaultId = `e2e-bulk-vault-${ts}`;

    const entries = [0, 1, 2].map((i) => ({
      path: `${vaultId}:entity-${ts}-${i}.md`,
      lastModified: ts,
      entity: {
        id: `entity-${ts}-${i}`,
        title: `Bulk Entity ${i}`,
        type: "npc",
        content: `Content ${i}`,
        lore: "",
        tags: [],
        labels: [`label-${i}`],
        aliases: [],
        connections: [],
        updatedAt: ts,
        status: "active",
        _path: [`entity-${ts}-${i}.md`],
      },
    }));

    const writeResult = await page.evaluate(
      async ({
        ents,
        modulePath,
      }: {
        ents: typeof entries;
        modulePath: string;
      }) => {
        try {
          const { cacheService } = await import(modulePath);
          await cacheService.bulkSet(ents as any);
          return { ok: true, error: null };
        } catch (err: any) {
          return { ok: false, error: err?.message ?? String(err) };
        }
      },
      { ents: entries, modulePath: CACHE_SERVICE_PATH },
    );

    expect(writeResult.error).toBeNull();
    expect(writeResult.ok).toBe(true);

    await page.reload();
    await waitForVaultIdle(page);

    const readResult = await page.evaluate(
      async ({
        paths,
        modulePath,
      }: {
        paths: string[];
        modulePath: string;
      }) => {
        try {
          const { cacheService } = await import(modulePath);
          const titles: (string | null)[] = [];
          for (const p of paths) {
            const hit = await cacheService.get(p);
            titles.push(hit?.entity?.title ?? null);
          }
          return { titles, error: null };
        } catch (err: any) {
          return { titles: [], error: err?.message ?? String(err) };
        }
      },
      { paths: entries.map((e) => e.path), modulePath: CACHE_SERVICE_PATH },
    );

    expect(readResult.error).toBeNull();
    expect(readResult.titles).toEqual([
      "Bulk Entity 0",
      "Bulk Entity 1",
      "Bulk Entity 2",
    ]);
  });
});

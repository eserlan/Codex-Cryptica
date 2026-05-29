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
 */

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
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      try {
        localStorage.setItem("codex_skip_landing", "true");
      } catch {
        /* ignore */
      }
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

    // Write via CacheService.set()
    const writeResult = await page.evaluate(
      async ({ p, e }: { p: string; e: any }) => {
        try {
          const { cacheService } = await import(
            "/src/lib/services/cache.svelte.ts"
          );
          await cacheService.set(p, Date.now(), e as any);
          return { ok: true, error: null };
        } catch (err: any) {
          return { ok: false, error: err?.message ?? String(err) };
        }
      },
      { p: path, e: entity },
    );

    expect(writeResult.error).toBeNull();
    expect(writeResult.ok).toBe(true);

    // Reload
    await page.reload();
    await waitForVaultIdle(page);

    // Read back — must still be there
    const readResult = await page.evaluate(
      async (p: string) => {
        try {
          const { cacheService } = await import(
            "/src/lib/services/cache.svelte.ts"
          );
          const hit = await cacheService.get(p);
          return { title: hit?.entity?.title ?? null, labels: hit?.entity?.labels ?? null, error: null };
        } catch (err: any) {
          return { title: null, labels: null, error: err?.message ?? String(err) };
        }
      },
      path,
    );

    expect(readResult.error).toBeNull();
    expect(readResult.title).toBe("Persist Test Entity");
    expect(readResult.labels).toContain("important");
  });

  test("CacheService.bulkSet() writes survive a page reload", async ({
    page,
  }) => {
    const vaultId = `e2e-bulk-vault-${Date.now()}`;
    const ts = Date.now();

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

    // Write via CacheService.bulkSet()
    const writeResult = await page.evaluate(
      async (ents: typeof entries) => {
        try {
          const { cacheService } = await import(
            "/src/lib/services/cache.svelte.ts"
          );
          await cacheService.bulkSet(ents as any);
          return { ok: true, error: null };
        } catch (err: any) {
          return { ok: false, error: err?.message ?? String(err) };
        }
      },
      entries,
    );

    expect(writeResult.error).toBeNull();
    expect(writeResult.ok).toBe(true);

    // Reload
    await page.reload();
    await waitForVaultIdle(page);

    // Read all three back
    const readResult = await page.evaluate(
      async (paths: string[]) => {
        try {
          const { cacheService } = await import(
            "/src/lib/services/cache.svelte.ts"
          );
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
      entries.map((e) => e.path),
    );

    expect(readResult.error).toBeNull();
    expect(readResult.titles).toEqual(["Bulk Entity 0", "Bulk Entity 1", "Bulk Entity 2"]);
  });
});

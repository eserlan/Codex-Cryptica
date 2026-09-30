import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { setupVaultPage } from "../test-helpers";
import {
  installLargeVaultFixture,
  LARGE_VAULT_ENTITY_COUNT,
} from "./fixtures/large-vault";

/**
 * How many times a warm reload reads the whole entity cache, when, and how
 * long each read takes. `CacheService.preloadVault` reads every graph record
 * from IndexedDB, so a second call that follows the first is a repeat of work
 * that was just done.
 *
 * The calls are recorded by wrapping `preloadVault` as soon as the app
 * publishes the cache service on `window`.
 */

test.describe.configure({ mode: "serial" });

test("warm reload cache preloads", async ({ page }) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => {
    (window as any).__CODEX_PERFORMANCE_CAPTURE__ = true;
    localStorage.setItem("codex_world_page_dismissed_at", String(Date.now()));
    const calls: any[] = [];
    (window as any).__preloadCalls = calls;
    Object.defineProperty(window, "cacheService", {
      configurable: true,
      set(service: any) {
        const original = service.preloadVault.bind(service);
        service.preloadVault = async (vaultId: string) => {
          const call: any = {
            startMs: Math.round(performance.now()),
            caller: (new Error().stack ?? "")
              .split("\n")
              .slice(2, 5)
              .map((line) => line.trim().replace(/\(.*\/assets\//, "("))
              .join(" < "),
          };
          calls.push(call);
          const started = performance.now();
          const result = await original(vaultId);
          call.durationMs = +(performance.now() - started).toFixed(1);
          call.entities = result.size;
          return result;
        };
        Object.defineProperty(window, "cacheService", {
          value: service,
          writable: true,
          configurable: true,
        });
      },
    });
  });

  await setupVaultPage(page);
  await installLargeVaultFixture(page);
  await page.evaluate(() => {
    (window as any).__preloadCalls.length = 0;
  });

  await page.reload();
  await page.waitForFunction(
    (entityCount) => {
      const vault = (window as any).vault;
      return (
        vault?.status === "idle" && vault.allEntities?.length === entityCount
      );
    },
    LARGE_VAULT_ENTITY_COUNT,
    { timeout: 60_000 },
  );
  // Give the background reconcile that follows a warm open time to start.
  await page.waitForTimeout(15_000);

  const calls = await page.evaluate(() => (window as any).__preloadCalls);
  const output = path.join("test-results", "vault-preload.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(calls, null, 2)}\n`);
  console.log(`VAULT_PRELOAD ${JSON.stringify(calls)}`);
  expect(calls.length).toBeGreaterThan(0);
});

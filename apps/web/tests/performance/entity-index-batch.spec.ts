import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { setupVaultPage } from "../test-helpers";
import {
  installLargeVaultFixture,
  LARGE_VAULT_ENTITY_COUNT,
} from "./fixtures/large-vault";

/**
 * Cost of pushing a batch of edited entities through the entity index, which
 * every edit, import and sync reconcile goes through.
 *
 * `content` edits change no index-relevant field; `connection` edits are
 * graph-relevant, so the graph must rebuild its elements too. Each figure is
 * the time of the call itself, and `settle` adds the two animation frames
 * after it, when the graph store and Cytoscape catch up.
 */

const BATCH_SIZES = [1, 50, 200, 800];
const ROUNDS = 5;

test.describe.configure({ mode: "serial" });

test("entity index batch cost", async ({ page }) => {
  test.setTimeout(240_000);
  await page.addInitScript(() => {
    (window as any).__CODEX_PERFORMANCE_CAPTURE__ = true;
    localStorage.setItem("codex_world_page_dismissed_at", String(Date.now()));
  });
  await setupVaultPage(page);
  await installLargeVaultFixture(page);
  // The reload gives the real cache-backed warm open the other scenarios use.
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
  await page.waitForFunction(
    () => {
      const cy = (window as any).cy;
      return Boolean(cy && cy.nodes().length > 0);
    },
    undefined,
    { timeout: 60_000 },
  );
  // Layout must be finished so the batch is measured against a settled graph.
  await page.waitForFunction(
    () => {
      const controller = (window as any).graphViewController;
      return Boolean(controller) && !controller.isLayoutRunning;
    },
    undefined,
    { timeout: 60_000 },
  );
  await page.waitForTimeout(2_000);

  const results = await page.evaluate(
    async ({ sizes, rounds, total }) => {
      const store = (window as any).vault.entityStore;
      const frames = () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
      const median = (values: number[]) =>
        [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

      const edited = (
        entity: any,
        mode: string,
        index: number,
        round: number,
      ) => {
        if (mode === "content")
          return { ...entity, content: `Edited ${mode} ${round}` };
        const kept = (entity.connections ?? []).filter(
          (c: any) => !String(c.type).startsWith("round-"),
        );
        const extra = {
          target: `benchmark-${(index + 7 + round) % total}`,
          type: `round-${round}`,
          label: "Edit",
          strength: 1,
        };
        return { ...entity, connections: [...kept, extra] };
      };

      const runRound = async (mode: string, size: number, round: number) => {
        const previous = { ...store.entities };
        const next = { ...previous };
        for (let i = 0; i < size; i += 1) {
          next[`benchmark-${i}`] = edited(
            previous[`benchmark-${i}`],
            mode,
            i,
            round,
          );
        }
        const started = performance.now();
        store.handleEntitiesUpdate(previous, next);
        const called = performance.now();
        await frames();
        const settled = performance.now();
        store.entities = next;
        await frames();
        return { call: called - started, settle: settled - started };
      };

      const measure = async (mode: string, size: number) => {
        const calls: number[] = [];
        const settles: number[] = [];
        for (let round = 1; round <= rounds; round += 1) {
          const { call, settle } = await runRound(mode, size, round);
          calls.push(call);
          settles.push(settle);
        }
        return {
          callMs: +median(calls).toFixed(1),
          settleMs: +median(settles).toFixed(1),
        };
      };

      const out: Record<string, { callMs: number; settleMs: number }> = {};
      for (const mode of ["content", "connection"]) {
        for (const size of sizes) {
          out[`${mode}-${size}`] = await measure(mode, size);
        }
      }
      return out;
    },
    { sizes: BATCH_SIZES, rounds: ROUNDS, total: LARGE_VAULT_ENTITY_COUNT },
  );

  const output = path.join("test-results", "entity-index-batch.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(results, null, 2)}\n`);
  console.log(`ENTITY_INDEX_BATCH ${JSON.stringify(results)}`);
  expect(Object.keys(results).length).toBe(BATCH_SIZES.length * 2);
});

import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { setupVaultPage } from "../test-helpers";
import {
  installLargeVaultFixture,
  LARGE_VAULT_ENTITY_COUNT,
} from "./fixtures/large-vault";

/**
 * What the graph does after a few rendered entities gain a connection: the
 * store rebuilds its elements, then Cytoscape is reconciled against them.
 * Reports the median duration of each recorded graph span, so the cost of the
 * whole-graph comparison is visible on its own (`graph_sync_reconcile`,
 * `graph_sync_patch_filter`) rather than buried in frame timing.
 */

const EDIT_SIZES = [1, 10, 50];
const ROUNDS = 5;
const SPANS = [
  "graph_focus_compute",
  "graph_sync_reconcile",
  "graph_sync_remove",
  "graph_sync_add",
  "graph_sync_patch_filter",
  "graph_sync_layout",
];

test.describe.configure({ mode: "serial" });

async function measureEdits({
  sizes,
  rounds,
  spans,
}: {
  sizes: number[];
  rounds: number;
  spans: string[];
}) {
  const store = (window as any).vault.entityStore;
  const samples = () =>
    (window as any).__CODEX_PERFORMANCE_RESULTS__?.getSamples() ?? [];
  const frames = () =>
    new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  const median = (values: number[]) =>
    values.length
      ? [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
      : null;
  const rendered: string[] = (window as any).cy
    .nodes()
    .map((node: any) => node.id());

  const runRound = async (size: number, round: number) => {
    const previous = { ...store.entities };
    const next = { ...previous };
    for (let i = 0; i < size; i += 1) {
      const id = rendered[i];
      const target = rendered[(i + 11 + round) % rendered.length];
      const kept = (previous[id].connections ?? []).filter(
        (c: any) => !String(c.type).startsWith("sync-"),
      );
      next[id] = {
        ...previous[id],
        connections: [
          ...kept,
          { target, type: `sync-${round}`, label: "Edit", strength: 1 },
        ],
      };
    }
    const startAt = samples().length;
    store.handleEntitiesUpdate(previous, next);
    store.entities = next;
    await frames();
    await new Promise((resolve) => setTimeout(resolve, 400));
    await frames();
    return samples().slice(startAt);
  };

  const out: Record<string, Record<string, number | null>> = {};
  for (const size of sizes) {
    const perSpan: Record<string, number[]> = {};
    for (let round = 1; round <= rounds; round += 1) {
      const roundSamples = await runRound(size, round);
      for (const span of spans) {
        const durations = roundSamples
          .filter((s: any) => s.operation === span)
          .map((s: any) => s.durationMs as number);
        if (durations.length)
          (perSpan[span] ??= []).push(
            durations.reduce((a: number, b: number) => a + b, 0),
          );
      }
    }
    out[`edit-${size}`] = Object.fromEntries(
      spans.map((span: string) => [
        span,
        perSpan[span] ? +median(perSpan[span])!.toFixed(1) : null,
      ]),
    );
  }
  return out;
}

test("graph sync after edits to rendered entities", async ({ page }) => {
  test.setTimeout(480_000);
  await page.addInitScript(() => {
    (window as any).__CODEX_PERFORMANCE_CAPTURE__ = true;
    localStorage.setItem("codex_world_page_dismissed_at", String(Date.now()));
  });
  await setupVaultPage(page);
  await installLargeVaultFixture(page);
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
  await page.waitForFunction(
    () => {
      const controller = (window as any).graphViewController;
      return Boolean(controller) && !controller.isLayoutRunning;
    },
    undefined,
    { timeout: 60_000 },
  );
  await page.waitForTimeout(2_000);

  // The first-run "vault theme" prompt covers the graph, and a covered graph
  // suspends itself, so nothing after this would sync until it is dismissed.
  const themePrompt = page.getByTestId("vault-theme-modal");
  if (await themePrompt.isVisible()) {
    await page.getByRole("button", { name: "LATER" }).click();
    await expect(themePrompt).toBeHidden();
  }
  await page.waitForFunction(
    () => (window as any).graphViewController?.isSuspended === false,
    undefined,
    { timeout: 30_000 },
  );
  await page.waitForTimeout(1_500);

  const args = { sizes: EDIT_SIZES, rounds: ROUNDS, spans: SPANS };
  const focus = await page.evaluate(measureEdits, args);

  // "Show full graph" renders every entity, where a whole-graph comparison
  // has far more to walk than in the default focus view.
  await page.evaluate(() => {
    (window as any).graph.showFullGraph = true;
  });
  await page.waitForFunction(
    () => {
      const cy = (window as any).cy;
      const controller = (window as any).graphViewController;
      return cy && cy.nodes().length > 1000 && !controller?.isLayoutRunning;
    },
    undefined,
    { timeout: 240_000 },
  );
  await page.waitForTimeout(3_000);
  const full = await page.evaluate(measureEdits, args);
  const results = { focus, full };

  const output = path.join("test-results", "graph-sync-edit.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(results, null, 2)}\n`);
  console.log(`GRAPH_SYNC_EDIT ${JSON.stringify(results)}`);
  expect(Object.keys(results.focus).length).toBe(EDIT_SIZES.length);
  expect(Object.keys(results.full).length).toBe(EDIT_SIZES.length);
});

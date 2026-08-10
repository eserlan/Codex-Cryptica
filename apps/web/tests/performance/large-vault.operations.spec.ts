import { expect, test } from "@playwright/test";
import { setupVaultPage } from "../test-helpers";
import {
  installLargeVaultFixture,
  LARGE_VAULT_ENTITY_COUNT,
} from "./fixtures/large-vault";
import {
  LARGE_VAULT_SCENARIOS,
  writeLargeVaultResults,
} from "./large-vault-results";
import { createPerformanceResult } from "@codex/performance-observability";

test.describe.configure({ mode: "serial" });

test("records repeatable large-vault operations in a production preview", async ({
  page,
}) => {
  test.setTimeout(120_000);
  let collectedSamples: any[] = [];
  const scenarios = new Map<string, any[]>();
  const captureScenario = (
    name: string,
    samples: any[],
    operations: string[],
  ) => {
    scenarios.set(
      name,
      samples.filter((sample) => operations.includes(sample.operation)),
    );
  };
  await page.addInitScript(() => {
    (window as any).__CODEX_PERFORMANCE_CAPTURE__ = true;
  });
  try {
    await setupVaultPage(page);
    await page.evaluate(async () => {
      const vault = (window as any).vault;
      if (vault?.activeVaultId) {
        await (window as any).cacheService?.clearVault(vault.activeVaultId);
        await vault.loadFiles(false);
      }
    });
    await installLargeVaultFixture(page);
    collectedSamples = await page.evaluate(
      () => (window as any).__CODEX_PERFORMANCE_RESULTS__?.getSamples() ?? [],
    );
    captureScenario("cold-open-index", collectedSamples, [
      "vault_open_cold",
      "vault_sync_chunk",
      "search_index_batch",
      "search_index_persist",
    ]);
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

    captureScenario(
      "warm-open",
      await page.evaluate(
        () => (window as any).__CODEX_PERFORMANCE_RESULTS__?.getSamples() ?? [],
      ),
      ["vault_open_warm"],
    );

    await page.waitForFunction(
      () => {
        const cy = (window as any).cy;
        return Boolean(cy && cy.nodes().length > 0);
      },
      undefined,
      { timeout: 60_000 },
    );

    // Ten deterministic selections exercise the renderer and selection pipeline.
    await page.evaluate(() => {
      const cy = (window as any).cy;
      for (let index = 0; index < 10; index += 1) {
        cy.$id(`benchmark-${index}`).emit("tap");
      }
    });
    await page.waitForFunction(() =>
      ((window as any).__CODEX_PERFORMANCE_RESULTS__?.getSamples() ?? []).some(
        (sample: any) => sample.operation === "graph_select",
      ),
    );
    captureScenario(
      "rendered-node-selection",
      await page.evaluate(
        () => (window as any).__CODEX_PERFORMANCE_RESULTS__?.getSamples() ?? [],
      ),
      ["graph_select"],
    );

    // Establish the zoom ratchet, then perform a real zoom-driven depth change.
    const focusDepth = await page.evaluate(() => {
      const graph = (window as any).graph;
      const cy = (window as any).cy;
      cy.zoom(cy.zoom() * 1.05);
      return graph.focusDepth;
    });
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const cy = (window as any).cy;
      cy.zoom(cy.zoom() * 1.3);
    });
    await page.waitForFunction(
      (previousDepth) => (window as any).graph.focusDepth > previousDepth,
      focusDepth,
    );
    captureScenario(
      "focus-depth-change",
      await page.evaluate(
        () => (window as any).__CODEX_PERFORMANCE_RESULTS__?.getSamples() ?? [],
      ),
      ["graph_focus_depth_change"],
    );

    await page
      .getByRole("switch", { name: "Switch to Full Toolbox mode" })
      .click();
    await page.evaluate(() =>
      (window as any).layoutUIStore.toggleSidebarTool("explorer"),
    );
    await expect(page.getByTestId("entity-explorer-panel")).toBeVisible({
      timeout: 30_000,
    });
    captureScenario(
      "explorer-workflow",
      await page.evaluate(
        () => (window as any).__CODEX_PERFORMANCE_RESULTS__?.getSamples() ?? [],
      ),
      ["explorer_open", "explorer_filter"],
    );
    const explorerSearch = page.getByPlaceholder("Search entities...");
    await explorerSearch.fill("benchmark entity 42");
    await explorerSearch.fill("");
    await page.getByLabel("Close Explorer").click();
    await page.evaluate(() =>
      (window as any).layoutUIStore.toggleSidebarTool("explorer"),
    );
    await expect(page.getByTestId("entity-explorer-panel")).toBeVisible({
      timeout: 30_000,
    });

    const graphPageSamples = await page.evaluate(
      () => (window as any).__CODEX_PERFORMANCE_RESULTS__?.getSamples() ?? [],
    );
    collectedSamples = [...collectedSamples, ...graphPageSamples];

    await page.getByTestId("activity-bar-table").click();
    const search = page.getByTestId("entity-table-search");
    await expect(search).toBeVisible();
    await search.fill("benchmark entity 42");
    await search.fill("");
    await page.getByRole("columnheader").first().click();
    captureScenario(
      "table-workflow",
      await page.evaluate(
        () => (window as any).__CODEX_PERFORMANCE_RESULTS__?.getSamples() ?? [],
      ),
      ["table_open", "table_filter", "table_sort"],
    );

    // Save one harmless edit through the real persistence path.
    await page.evaluate(async () => {
      await (window as any).vault.updateEntity("benchmark-42", {
        content: "Deterministic benchmark content, revised.",
      });
    });
    captureScenario(
      "entity-save",
      await page.evaluate(
        () => (window as any).__CODEX_PERFORMANCE_RESULTS__?.getSamples() ?? [],
      ),
      ["entity_save"],
    );
    const samples = await page.evaluate(
      () => (window as any).__CODEX_PERFORMANCE_RESULTS__?.getSamples() ?? [],
    );
    expect(samples.length).toBeGreaterThan(0);
    expect(samples.every((sample: any) => sample.schemaVersion === 1)).toBe(
      true,
    );
  } finally {
    const samples = await page
      .evaluate(
        () => (window as any).__CODEX_PERFORMANCE_RESULTS__?.getSamples() ?? [],
      )
      .catch(() => []);
    writeLargeVaultResults(
      [...collectedSamples, ...samples],
      {
        browserVersion: page.context().browser()?.version() ?? "unknown",
        cacheState: "cold-and-warm",
      },
      Object.fromEntries(
        LARGE_VAULT_SCENARIOS.map((scenario) => [
          scenario,
          createPerformanceResult(scenarios.get(scenario) ?? []),
        ]),
      ),
    );
  }
});

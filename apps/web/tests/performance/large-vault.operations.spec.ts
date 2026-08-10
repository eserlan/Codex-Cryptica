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
import {
  createPerformanceResult,
  type PerformanceOperation,
  type PerformanceSampleV1,
} from "@codex/performance-observability";

test.describe.configure({ mode: "serial" });

test("records repeatable large-vault operations in a production preview", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const scenarios = new Map<string, PerformanceSampleV1[]>();
  const getSamples = () =>
    page.evaluate(
      () => (window as any).__CODEX_PERFORMANCE_RESULTS__?.getSamples() ?? [],
    ) as Promise<PerformanceSampleV1[]>;
  const captureScenario = async (
    name: string,
    startAt: number,
    operations: readonly PerformanceOperation[],
  ) => {
    const samples = await getSamples();
    scenarios.set(
      name,
      samples
        .slice(startAt)
        .filter((sample) => operations.includes(sample.operation)),
    );
  };
  await page.addInitScript(() => {
    (window as any).__CODEX_PERFORMANCE_CAPTURE__ = true;
    localStorage.setItem("codex_world_page_dismissed_at", String(Date.now()));
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
    await captureScenario("cold-open-index", 0, [
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

    // The reload itself exercises the real cache-backed warm-open lifecycle.
    await page.waitForFunction(() =>
      ((window as any).__CODEX_PERFORMANCE_RESULTS__?.getSamples() ?? []).some(
        (sample: any) => sample.operation === "vault_open_warm",
      ),
    );
    await captureScenario("warm-open", 0, ["vault_open_warm"]);

    await page.waitForFunction(
      () => {
        const cy = (window as any).cy;
        return Boolean(cy && cy.nodes().length > 0);
      },
      undefined,
      { timeout: 60_000 },
    );

    // Select through the graph event handler so every sample includes the
    // delayed state update and the two post-selection animation frames.
    const selectionStart = (await getSamples()).length;
    for (let index = 0; index < 10; index += 1) {
      const sampleStart = (await getSamples()).length;
      const position = await page.evaluate((nodeIndex) => {
        const cy = (window as any).cy;
        const nodes = cy.nodes().toArray();
        const node = nodes[nodeIndex % nodes.length];
        const rendered = node.renderedPosition();
        const rect = cy.container().getBoundingClientRect();
        return { x: rect.left + rendered.x, y: rect.top + rendered.y };
      }, index);
      await page.mouse.click(position.x, position.y);
      await page.waitForFunction(
        (startAt) =>
          ((window as any).__CODEX_PERFORMANCE_RESULTS__?.getSamples() ?? [])
            .slice(startAt)
            .some((sample: any) => sample.operation === "graph_select"),
        sampleStart,
        { timeout: 10_000 },
      );
    }
    await captureScenario("rendered-node-selection", selectionStart, [
      "graph_select",
    ]);

    // Focus-depth changes operate on the real culled focus view, not the full
    // graph. Pinning the selected fixture entity activates that lifecycle.
    await page.evaluate(() => {
      (window as any).vault.selectedEntityId = "benchmark-42";
      (window as any).graph.focusRootId = "benchmark-42";
      (window as any).graph.ensureFocusRoot();
    });
    await page.waitForFunction(
      (entityCount) => {
        const graph = (window as any).graph;
        const cy = (window as any).cy;
        return Boolean(
          graph?.focusViewActive &&
          cy?.nodes().length > 0 &&
          cy.nodes().length < entityCount,
        );
      },
      LARGE_VAULT_ENTITY_COUNT,
      { timeout: 60_000 },
    );

    // Exercise five expansion/contraction cycles. The controller owns the
    // measured render-ready lifecycle, avoiding a competing test-owned span.
    const focusStart = (await getSamples()).length;
    const focusDepth = await page.evaluate(
      () => (window as any).graph.focusDepth,
    );
    const changedFocusDepth = focusDepth < 3 ? focusDepth + 1 : focusDepth - 1;
    for (let cycle = 0; cycle < 5; cycle += 1) {
      for (const nextFocusDepth of [changedFocusDepth, focusDepth]) {
        const sampleStart = (await getSamples()).length;
        await page.evaluate((nextDepth) => {
          (window as any).graph.focusDepth = nextDepth;
        }, nextFocusDepth);
        await page.waitForFunction(
          (startAt) =>
            ((window as any).__CODEX_PERFORMANCE_RESULTS__?.getSamples() ?? [])
              .slice(startAt)
              .some(
                (sample: any) =>
                  sample.operation === "graph_focus_depth_change" &&
                  sample.outcome === "completed",
              ),
          sampleStart,
        );
      }
    }
    await captureScenario("focus-depth-change", focusStart, [
      "graph_focus_depth_change",
    ]);

    const explorerStart = (await getSamples()).length;
    await page
      .getByRole("switch", { name: "Switch to Full Toolbox mode" })
      .click();
    const explorerSearch = page.getByPlaceholder("Search entities...");
    for (let cycle = 0; cycle < 5; cycle += 1) {
      await page.evaluate(() =>
        (window as any).layoutUIStore.toggleSidebarTool("explorer"),
      );
      await expect(page.getByTestId("entity-explorer-panel")).toBeVisible({
        timeout: 30_000,
      });
      await explorerSearch.fill(`benchmark entity ${cycle}`);
      await explorerSearch.fill("");
      await page.getByLabel("Close Explorer").click();
    }
    await captureScenario("explorer-workflow", explorerStart, [
      "explorer_open",
      "explorer_filter",
    ]);

    const tableStart = (await getSamples()).length;
    const search = page.getByTestId("entity-table-search");
    for (let cycle = 0; cycle < 5; cycle += 1) {
      const sampleStart = (await getSamples()).length;
      await page.getByTestId("activity-bar-table").click();
      await expect(search).toBeVisible();
      await search.fill(`benchmark entity ${cycle}`);
      await search.fill("");
      await page.getByTestId("entity-table-sort-title").click();
      await page.waitForFunction(
        (startAt) =>
          ((window as any).__CODEX_PERFORMANCE_RESULTS__?.getSamples() ?? [])
            .slice(startAt)
            .some((sample: any) => sample.operation === "table_sort"),
        sampleStart,
      );
      await page.getByTestId("activity-bar-graph").click();
    }
    await captureScenario("table-workflow", tableStart, [
      "table_open",
      "table_filter",
      "table_sort",
    ]);

    // Save a deterministic sequence through the real persistence path.
    const saveStart = (await getSamples()).length;
    for (let revision = 0; revision < 10; revision += 1) {
      const sampleStart = (await getSamples()).length;
      await page.evaluate(async (nextRevision) => {
        await (window as any).vault.updateEntity("benchmark-42", {
          content: `Deterministic benchmark content, revision ${nextRevision}.`,
        });
      }, revision);
      await page.waitForFunction(
        (startAt) =>
          ((window as any).__CODEX_PERFORMANCE_RESULTS__?.getSamples() ?? [])
            .slice(startAt)
            .some((sample: any) => sample.operation === "entity_save"),
        sampleStart,
      );
    }
    await captureScenario("entity-save", saveStart, ["entity_save"]);
    const samples = await getSamples();
    expect(samples.length).toBeGreaterThan(0);
    expect(samples.every((sample: any) => sample.schemaVersion === 1)).toBe(
      true,
    );
  } finally {
    const aggregateSamples = [...scenarios.values()].flat();
    writeLargeVaultResults(
      aggregateSamples,
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

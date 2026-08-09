import { expect, test } from "@playwright/test";
import { setupVaultPage } from "../test-helpers";
import {
  installLargeVaultFixture,
  LARGE_VAULT_ENTITY_COUNT,
} from "./fixtures/large-vault";
import { writeLargeVaultResults } from "./large-vault-results";

test.describe.configure({ mode: "serial" });

test("records repeatable large-vault operations in a production preview", async ({
  page,
}) => {
  test.setTimeout(120_000);
  let collectedSamples: any[] = [];
  await page.addInitScript(() => {
    (window as any).__CODEX_PERFORMANCE_CAPTURE__ = true;
  });
  try {
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

    // Ten deterministic selections exercise the renderer and selection pipeline.
    await page.evaluate(() => {
      const cy = (window as any).cy;
      for (let index = 0; index < 10; index += 1) {
        cy.$id(`benchmark-${index}`).emit("tap");
      }
    });

    // Focus depth expansion and contraction use the same deterministic node set.
    await page.evaluate(() => {
      const graph = (window as any).graph;
      graph.focusViewActive = true;
      graph.focusDepth = Math.min(graph.focusDepth + 1, 6);
      graph.focusDepth = Math.max(graph.focusDepth - 1, 1);
    });
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    collectedSamples = await page.evaluate(
      () => (window as any).__CODEX_PERFORMANCE_RESULTS__?.getSamples() ?? [],
    );

    await page.goto("/table");
    await page.waitForFunction(
      (entityCount) =>
        (window as any).vault?.allEntities?.length === entityCount,
      LARGE_VAULT_ENTITY_COUNT,
      { timeout: 60_000 },
    );
    const search = page.getByTestId("entity-table-search");
    await expect(search).toBeVisible();
    await search.fill("benchmark entity 42");
    await search.fill("");
    await page.getByRole("columnheader").first().click();

    // Save one harmless edit through the real persistence path.
    await page.evaluate(async () => {
      await (window as any).vault.updateEntity("benchmark-42", {
        content: "Deterministic benchmark content, revised.",
      });
    });
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
    writeLargeVaultResults([...collectedSamples, ...samples]);
  }
});

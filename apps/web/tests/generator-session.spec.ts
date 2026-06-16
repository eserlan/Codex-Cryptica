import { test, expect } from "@playwright/test";
import { dismissFrontPage, seedEntity, setupVaultPage } from "./test-helpers";

const ORACLE_PROXY = "https://oracle-proxy.espen-erlandsen.workers.dev";

test.describe("In-app generator sessions", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__SHARED_GEMINI_KEY__ = "fake-key";
    });
    await setupVaultPage(page);
  });

  test("threads accepted generated drafts through the interaction proxy", async ({
    page,
  }) => {
    const requests: Array<Record<string, unknown>> = [];
    await page.route(ORACLE_PROXY, async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      requests.push(body);
      const id = `interaction-${requests.length}`;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id,
          text: JSON.stringify({
            title:
              requests.length === 1 ? "E2E Salt Concord" : "E2E Market Envoy",
            summary: "Generated through the mocked interaction proxy.",
            lore: "## Summary\nA generated campaign detail.\n## Hook\nIt connects to prior accepted context.",
            labels: ["e2e-generator"],
          }),
        }),
      });
    });

    await seedEntity(page, {
      type: "location",
      title: "Ash Market",
      content:
        "A fire-scarred trading quarter full of contracts, debt, and guild agents.",
      select: true,
    });

    await page.waitForFunction(
      () =>
        !!(window as any).revisionService &&
        !!(window as any).generatorSessionManager &&
        !!(window as any).oracle &&
        !!(window as any).modalUIStore,
      undefined,
      { timeout: 15000 },
    );

    await page.evaluate(() => {
      (window as any).oracle.isEnabled = true;
      (window as any).generatorSessionManager.setEnabled(true);
    });

    async function generateAndAccept(
      generatorId: string,
      instructions: string,
    ) {
      await page.evaluate((id) => {
        (window as any).modalUIStore.openGeneratorWorkflow(id);
      }, generatorId);

      const dialog = page.getByRole("dialog", { name: /generate/i });
      await expect(dialog).toBeVisible({ timeout: 10000 });
      await dialog.getByLabel(/instructions/i).fill(instructions);
      await dialog.getByRole("button", { name: "Generate" }).click();

      await expect(
        page.getByRole("dialog", { name: /review draft/i }),
      ).toBeVisible({
        timeout: 10000,
      });
      await page.getByRole("button", { name: /open in editor/i }).click();

      await page.waitForFunction(
        () => !!(window as any).revisionService?.pendingDraft,
        undefined,
        { timeout: 10000 },
      );
      await page.evaluate(async () => {
        await (window as any).revisionService.acceptDraft();
      });
      await page.waitForFunction(
        () => !(window as any).revisionService?.pendingDraft,
        undefined,
        { timeout: 10000 },
      );
      await dismissFrontPage(page);
    }

    await generateAndAccept("faction", "Create a trade faction.");
    await generateAndAccept(
      "npc",
      "Create an envoy who knows the accepted faction.",
    );

    expect(requests).toHaveLength(2);
    expect(requests[0].previous_interaction_id).toBeUndefined();
    expect(requests[1].previous_interaction_id).toBe("interaction-1");
    const secondInput = String(requests[1].input);
    expect(secondInput).toContain("[RELEVANT EARLIER RECORDS]");
    expect(secondInput).toContain("E2E Salt Concord");

    const metrics = await page.evaluate(() =>
      (window as any).generatorSessionManager.getPromptMetrics(),
    );
    expect(metrics).toHaveLength(2);
    expect(metrics[0].usedInteraction).toBe(true);
    expect(metrics[1].usedInteraction).toBe(true);
    expect(metrics[1].sentPromptChars).toBeGreaterThan(0);

    const titles = await page.evaluate(() =>
      Object.values((window as any).vault.entities).map(
        (entity: any) => entity.title,
      ),
    );
    expect(titles).toContain("E2E Salt Concord");
    expect(titles).toContain("E2E Market Envoy");
  });
});

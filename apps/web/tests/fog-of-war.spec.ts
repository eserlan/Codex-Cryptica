import { test, expect } from "@playwright/test";
import { setupVaultPage, seedEntities } from "./test-helpers";

test.describe("Fog of War", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);

    await seedEntities(page, [
      {
        id: "visible-node",
        title: "Visible Node",
        type: "character",
        data: { content: "Visible content", labels: [] },
      },
      {
        id: "hidden-node",
        title: "Hidden Node",
        type: "character",
        data: { content: "Hidden content", labels: ["hidden"] },
      },
      {
        id: "revealed-node",
        title: "Revealed Node",
        type: "character",
        data: { content: "Revealed content", labels: ["revealed"] },
      },
    ]);
  });

  test("Selective hiding with 'hidden' tag", async ({ page }) => {
    // 1. Verify Shared Mode toggle is present
    const toggle = page.getByTestId("shared-mode-toggle");
    await expect(toggle).toBeVisible();

    // 2. Toggle Shared Mode via evaluate to be sure it's set
    await page.evaluate(() => {
      const w = window as any;
      if (w.sessionModeStore) w.sessionModeStore.sharedMode = true;
      if (w.uiStore) w.uiStore.sharedMode = true;
    });

    // Wait for graph to reactively update
    await page.waitForTimeout(500);

    // 3. Check graph elements via store (0 leakage verification)
    const visibleIds = await page.evaluate(() => {
      return (window as any).graph.elements
        .filter((e: any) => e.group === "nodes")
        .map((n: any) => n.data.id);
    });

    expect(visibleIds).toContain("visible-node");
    expect(visibleIds).toContain("revealed-node");
    expect(visibleIds).not.toContain("hidden-node");

    // 4. Verify Search also filters
    const filteredSearchIds = await page.evaluate(async () => {
      const { uiStore, sessionModeStore, vault, isEntityVisible } =
        window as any;
      const results = Object.values(vault.entities).map((e: any) => ({
        id: e.id,
        title: e.title,
      }));
      const settings = {
        sharedMode: sessionModeStore?.sharedMode ?? uiStore?.sharedMode,
        defaultVisibility: vault.defaultVisibility,
      };
      return results
        .filter((r: any) => isEntityVisible(vault.entities[r.id], settings))
        .map((r: any) => r.id);
    });

    expect(filteredSearchIds).not.toContain("hidden-node");
  });

  test("Global Fog / Hidden by Default", async ({ page }) => {
    // 1. Set Shared Mode and Default Visibility to 'hidden'
    await page.evaluate(() => {
      const w = window as any;
      if (w.sessionModeStore) w.sessionModeStore.sharedMode = true;
      if (w.uiStore) w.uiStore.sharedMode = true;
      if (w.vault) w.vault.defaultVisibility = "hidden";
    });

    // Wait for reactivity
    await page.waitForTimeout(500);

    // 2. Verify graph only contains 'revealed-node'
    const visibleIds = await page.evaluate(() => {
      return (window as any).graph.elements
        .filter((e: any) => e.group === "nodes")
        .map((n: any) => n.data.id);
    });

    expect(visibleIds).not.toContain("visible-node");
    expect(visibleIds).not.toContain("hidden-node");
    expect(visibleIds).toContain("revealed-node");
  });

  test("Real-time revealing of content", async ({ page }) => {
    // 1. Enter Shared Mode and Hidden by Default
    await page.evaluate(() => {
      const w = window as any;
      if (w.sessionModeStore) w.sessionModeStore.sharedMode = true;
      if (w.uiStore) w.uiStore.sharedMode = true;
      if (w.vault) w.vault.defaultVisibility = "hidden";
    });

    // Wait for reactivity
    await page.waitForTimeout(500);

    // 2. Verify everything is hidden except 'revealed-node'
    let visibleIds = await page.evaluate(() => {
      return (window as any).graph.elements
        .filter((e: any) => e.group === "nodes")
        .map((n: any) => n.data.id);
    });
    expect(visibleIds).not.toContain("visible-node");

    // 3. Update 'visible-node' to have 'revealed' label
    await page.evaluate(async () => {
      const { vault } = window as any;
      await vault.updateEntity("visible-node", { labels: ["revealed"] });
    });

    // Wait for reactivity
    await page.waitForTimeout(500);

    // 4. Verify 'visible-node' appears instantly
    visibleIds = await page.evaluate(() => {
      return (window as any).graph.elements
        .filter((e: any) => e.group === "nodes")
        .map((n: any) => n.data.id);
    });
    expect(visibleIds).toContain("visible-node");
  });
});

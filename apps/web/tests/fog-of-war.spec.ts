import { test, expect } from "@playwright/test";

test.describe("Fog of War", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
    });

    await page.goto("./");

    // Wait for header to ensure layout is loaded
    await expect(
      page.getByRole("heading", { name: "Codex Cryptica" }),
    ).toBeVisible({ timeout: 15000 });

    // Use the exposed stores to set up state directly, which is more reliable for E2E
    await page.waitForFunction(
      () => {
        return (
          (window as any).vault &&
          (window as any).searchStore &&
          (window as any).uiStore &&
          (window as any).graph
        );
      },
      { timeout: 15000 },
    );

    // Create entities via vault API to trigger proper reactivity
    await page.evaluate(async () => {
      const { vault } = window as any;

      await vault.createEntity("character", "Visible Node", {
        content: "Visible content",
        tags: [],
      });
      await vault.createEntity("character", "Hidden Node", {
        content: "Hidden content",
        tags: ["hidden"],
      });
      await vault.createEntity("character", "Revealed Node", {
        content: "Revealed content",
        tags: ["revealed"],
      });
    });

    // Wait for entities to appear in graph
    await page.waitForFunction(
      () =>
        (window as any).graph.elements.filter((e: any) => e.group === "nodes")
          .length >= 3,
      { timeout: 10000 },
    );
  });

  test("Selective hiding with 'hidden' tag", async ({ page }) => {
    // 1. Verify Shared Mode toggle is present
    const toggle = page.getByTestId("shared-mode-toggle");
    await expect(toggle).toBeVisible();

    // 2. Toggle Shared Mode via evaluate to be sure it's set
    await page.evaluate(() => {
      (window as any).uiStore.sharedMode = true;
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
      const { uiStore, vault, isEntityVisible } = window as any;
      const results = Object.values(vault.entities).map((e: any) => ({
        id: e.id,
        title: e.title,
      }));
      const settings = {
        sharedMode: uiStore.sharedMode,
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
      (window as any).uiStore.sharedMode = true;
      (window as any).vault.defaultVisibility = "hidden";
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
      (window as any).uiStore.sharedMode = true;
      (window as any).vault.defaultVisibility = "hidden";
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

    // 3. Update 'visible-node' to have 'revealed' tag
    await page.evaluate(() => {
      const { vault } = window as any;
      const entity = vault.entities["visible-node"];
      vault.entities["visible-node"] = { ...entity, tags: ["revealed"] };
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

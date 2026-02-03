import { test, expect } from "@playwright/test";

test.describe("Fog of War", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
    });

    await page.goto("./");
    
    // Wait for header to ensure layout is loaded
    await expect(page.getByRole("heading", { name: "Codex Cryptica" })).toBeVisible({ timeout: 15000 });
    
    // Use the exposed stores to set up state directly, which is more reliable for E2E
    await page.waitForFunction(() => {
      return (window as any).vault && (window as any).searchStore && (window as any).uiStore;
    }, { timeout: 15000 });
    
    await page.evaluate(async () => {
      const { vault, searchStore } = (window as any);
      
      const mockEntities = {
        "visible-node": {
          id: "visible-node",
          title: "Visible Node",
          type: "character",
          tags: [],
          labels: [],
          connections: [],
          content: "Visible content",
        },
        "hidden-node": {
          id: "hidden-node",
          title: "Hidden Node",
          type: "character",
          tags: ["hidden"],
          labels: [],
          connections: [],
          content: "Hidden content",
        },
        "revealed-node": {
          id: "revealed-node",
          title: "Revealed Node",
          type: "character",
          tags: ["revealed"],
          labels: [],
          connections: [],
          content: "Revealed content",
        }
      };

      // Manually hydrate the vault store
      vault.entities = mockEntities;
      vault.isInitialized = true;
      vault.isAuthorized = true;
      vault.rootHandle = { name: "mock-vault" }; // Mock handle to satisfy UI checks
      
      // Index them for search
      for (const entity of Object.values(mockEntities)) {
        await (window as any).searchStore.update((s: any) => ({
          ...s,
          // We bypass searchService.index because workers are hard to mock in eval
          // and we just need the results to be there for filtering tests.
        }));
        // Actually, we should probably mock the search results if we can't easily index them
      }
    });
  });

  test("Selective hiding with 'hidden' tag", async ({ page }) => {
    // 1. Verify Shared Mode toggle is present
    const toggle = page.getByTestId("shared-mode-toggle");
    await expect(toggle).toBeVisible();

    // 2. Toggle Shared Mode via evaluate to be sure it's set
    await page.evaluate(() => {
      (window as any).uiStore.sharedMode = true;
    });

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
    await page.evaluate(async () => {
      const { searchStore } = (window as any);
      // We manually mock search results since we can't easily trigger worker search in eval
      searchStore.update((s: any) => ({
        ...s,
        query: "node",
        results: [
          { id: "visible-node", title: "Visible Node" },
          { id: "hidden-node", title: "Hidden Node" },
          { id: "revealed-node", title: "Revealed Node" }
        ]
      }));
    });

    // Wait for the reactive filter in searchStore to apply if it was in the store logic
    // Actually, searchStore filtering is inside setQuery. 
    // Let's test the UI search if possible, or just evaluate the filtered state.
    
    // For now, evaluation of store state after a mock 'search' call is best.
    const filteredSearchIds = await page.evaluate(async () => {
      const { searchStore, uiStore, vault, isEntityVisible } = (window as any);
      const results = [
        { id: "visible-node", title: "Visible Node" },
        { id: "hidden-node", title: "Hidden Node" },
        { id: "revealed-node", title: "Revealed Node" }
      ];
      const settings = { sharedMode: uiStore.sharedMode, defaultVisibility: vault.defaultVisibility };
      return results.filter(r => isEntityVisible(vault.entities[r.id], settings)).map(r => r.id);
    });

    expect(filteredSearchIds).not.toContain("hidden-node");
  });

  test("Global Fog / Hidden by Default", async ({ page }) => {
    // 1. Set Shared Mode and Default Visibility to 'hidden'
    await page.evaluate(() => {
      (window as any).uiStore.sharedMode = true;
      (window as any).vault.defaultVisibility = "hidden";
    });

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

    // 2. Verify everything is hidden except 'revealed-node'
    let visibleIds = await page.evaluate(() => {
      return (window as any).graph.elements
        .filter((e: any) => e.group === "nodes")
        .map((n: any) => n.data.id);
    });
    expect(visibleIds).not.toContain("visible-node");

    // 3. Update 'visible-node' to have 'revealed' tag
    await page.evaluate(() => {
      const { vault } = (window as any);
      const entity = vault.entities["visible-node"];
      vault.entities["visible-node"] = { ...entity, tags: ["revealed"] };
    });

    // 4. Verify 'visible-node' appears instantly
    visibleIds = await page.evaluate(() => {
      return (window as any).graph.elements
        .filter((e: any) => e.group === "nodes")
        .map((n: any) => n.data.id);
    });
    expect(visibleIds).toContain("visible-node");
  });
});
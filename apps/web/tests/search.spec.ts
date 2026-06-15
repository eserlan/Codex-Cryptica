import { test, expect, type Page } from "@playwright/test";

async function dismissFrontPage(page: Page) {
  await page.evaluate(() => {
    const onboarding = (window as any).onboardingStore;
    if (onboarding) {
      onboarding.dismissedWorldPage = true;
      onboarding.dismissedLandingPage = true;
      onboarding.skipWelcomeScreen = true;
    }
    const ui = (window as any).uiStore;
    if (ui) {
      ui.dismissedWorldPage = true;
      ui.dismissedLandingPage = true;
      ui.skipWelcomeScreen = true;
    }
  });
}

// Helper to create entities via API and wait for search index
async function createEntitiesAndWaitForIndex(
  page: Page,
  entities: { name: string; type?: string }[],
) {
  await page.waitForFunction(
    () =>
      (window as any).vault?.isInitialized === true &&
      (window as any).vault?.status === "idle" &&
      !!(window as any).searchStore,
    { timeout: 15000 },
  );
  await dismissFrontPage(page);

  const createdIds: string[] = [];
  for (const entity of entities) {
    const id = await page.evaluate(
      async ({ name, type }: { name: string; type: string }) => {
        return await (window as any).vault.createEntity(type, name);
      },
      { name: entity.name, type: entity.type ?? "character" },
    );
    createdIds.push(id as string);
  }

  // Wait for all created entities to appear in the search index
  for (let i = 0; i < createdIds.length; i++) {
    const id = createdIds[i];
    const name = entities[i].name;
    await page.waitForFunction(
      async ({ id, name }: { id: string; name: string }) => {
        const s = (window as any).searchStore;
        if (!s?.setQuery) return false;
        try {
          await s.setQuery(name);
          // Verify a result with our specific entity ID is present
          return (
            Array.isArray(s.results) && s.results.some((r: any) => r.id === id)
          );
        } catch {
          return false;
        }
      },
      { id, name },
      { timeout: 15000 },
    );
  }
  // Reset query after polling
  await page.evaluate(() => (window as any).searchStore?.setQuery(""));
  // Wait for search index status to be ready or idle (background indexing completed)
  await page.waitForFunction(
    () => {
      const s = (window as any).searchStore;
      return (
        s &&
        (s.indexProgress.status === "ready" ||
          s.indexProgress.status === "idle")
      );
    },
    { timeout: 15000 },
  );
  // Wait for vault to be idle before finishing
  await page.waitForFunction(() => (window as any).vault?.status === "idle");
}

test.describe("Fuzzy Search", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.error("PAGE ERROR:", msg.text());
      } else {
        console.log("PAGE LOG:", msg.text());
      }
    });
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );
    });
  });

  test("Search works offline", async ({ page, context }) => {
    await page.goto("/");

    await createEntitiesAndWaitForIndex(page, [
      { name: "My Note" },
      { name: "The Crone" },
    ]);

    // Warm up: open modal, search, and close — ensures search worker + lazy component are cached
    await page.evaluate(() => (window as any).searchStore?.open());
    const input = page.getByPlaceholder("Search notes...");
    await expect(input).toBeVisible({
      timeout: 5000,
    });
    await page.evaluate(() => (window as any).searchStore?.setQuery("My Note"));
    await input.fill("My Note");
    await expect(
      page.getByTestId("search-result").filter({ hasText: /my.*note/i }),
    ).toBeVisible({ timeout: 15000 });
    await page.evaluate(() => (window as any).searchStore?.close());
    await expect(page.getByTestId("search-modal")).not.toBeVisible({
      timeout: 3000,
    });

    // Go Offline
    await context.setOffline(true);

    // Open Search Modal — use store API (keyboard shortcut unreliable cross-OS)
    await page.evaluate(() => (window as any).searchStore?.open());
    await expect(input).toBeVisible({ timeout: 5000 });

    // Fill search query (set store and input together)
    await page.evaluate(() => (window as any).searchStore?.setQuery("My Note"));
    await input.fill("My Note");

    // Verify results
    await expect(
      page.getByTestId("search-result").filter({ hasText: /my.*note/i }),
    ).toBeVisible({ timeout: 15000 });

    // Click the result directly
    await page
      .getByTestId("search-result")
      .filter({ hasText: /my.*note/i })
      .click();

    await expect(input).not.toBeVisible({ timeout: 2000 });

    // Verify Detail Panel opens
    await expect(
      page.getByRole("heading", { level: 2 }).filter({ hasText: /my.*note/i }),
    ).toBeVisible();

    // Restore network so subsequent tests aren't affected
    await context.setOffline(false);
  });

  test("handles search results with missing IDs via path fallback", async ({
    page,
  }) => {
    await page.goto("/");

    await createEntitiesAndWaitForIndex(page, [
      { name: "My Note" },
      { name: "The Crone" },
    ]);

    // Mock broken search results
    await page.evaluate(() => {
      const mockResults = [
        {
          id: undefined,
          title: "The Crone",
          path: "the-crone",
          matchType: "content",
          score: 0.9,
          excerpt: "The Crone is a mysterious figure...",
        },
      ];

      const { searchStore } = window as any;
      if (searchStore) {
        searchStore.query = "Crone";
        searchStore.results = mockResults;
        searchStore.isOpen = true;
      }
    });

    // Verify the "broken" result is visible
    const resultItem = page
      .getByTestId("search-result")
      .filter({ hasText: "The Crone" });
    await expect(resultItem).toBeVisible();

    // Select the result
    await resultItem.click();

    // Verify Fallback worked
    await expect(page.getByPlaceholder("Search notes...")).not.toBeVisible();

    // Check for the title in the detail panel
    await expect(
      page.getByRole("heading", { level: 2 }).filter({ hasText: /Crone/i }),
    ).toBeVisible();
  });

  test("selecting search result does not add redundant URL parameters", async ({
    page,
  }) => {
    await page.goto("/");

    await createEntitiesAndWaitForIndex(page, [
      { name: "My Note" },
      { name: "The Crone" },
    ]);

    // Open Search Modal
    await page.evaluate(() => (window as any).searchStore?.open());
    const input = page.getByPlaceholder("Search notes...");
    await expect(input).toBeVisible({
      timeout: 5000,
    });

    // Fill search query (set store and input together)
    await page.evaluate(() => (window as any).searchStore?.setQuery("My Note"));
    await input.fill("My Note");
    const resultItem = page
      .getByTestId("search-result")
      .filter({ hasText: /my.*note/i });
    await expect(resultItem).toBeVisible({ timeout: 15000 });

    // Click the result
    await resultItem.click();

    // Verify modal closed and entity selected
    await expect(page.getByPlaceholder("Search notes...")).not.toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2 }).filter({ hasText: /my.*note/i }),
    ).toBeVisible();

    // CRITICAL: Verify URL does not contain ?file=
    const url = page.url();
    expect(url).not.toContain("file=");
  });

  test("selecting a searched entity zooms the graph to level 2", async ({
    page,
  }) => {
    await page.goto("/");

    await createEntitiesAndWaitForIndex(page, [{ name: "My Note" }]);

    await page.evaluate(() => (window as any).searchStore?.open());
    const input = page.getByPlaceholder("Search notes...");
    await expect(input).toBeVisible({
      timeout: 5000,
    });

    // Fill search query (set store and input together)
    await page.evaluate(() => (window as any).searchStore?.setQuery("My Note"));
    await input.fill("My Note");
    const resultItem = page
      .getByTestId("search-result")
      .filter({ hasText: /my.*note/i });
    await expect(resultItem).toBeVisible({ timeout: 15000 });

    await resultItem.click();

    await expect(page.getByPlaceholder("Search notes...")).not.toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2 }).filter({ hasText: /my.*note/i }),
    ).toBeVisible();

    await page.waitForFunction(
      () => {
        const cy = (window as any).cy;
        return cy && Math.abs(cy.zoom() - 2) < 0.15;
      },
      null,
      { timeout: 10000 },
    );

    const zoom = await page.evaluate(() => (window as any).cy?.zoom());
    expect(zoom).toBeGreaterThan(1.8);
    expect(zoom).toBeLessThan(2.2);
  });

  test("shows recent searches from localStorage when opening with empty query", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForFunction(
      () =>
        (window as any).vault?.isInitialized === true &&
        (window as any).vault?.status === "idle" &&
        !!(window as any).searchStore,
      { timeout: 15000 },
    );

    // Set recents using the actual vault-specific key (matches getStorageKey() in SearchStore)
    await page.evaluate(() => {
      const vaultId = (window as any).vault?.activeVaultId || "default";
      const recents = [
        {
          id: "recent-note",
          title: "Recent Note",
          path: "recent-note.md",
          score: 0.5,
          matchType: "title",
        },
      ];
      localStorage.setItem(
        `search_recents_${vaultId}`,
        JSON.stringify(recents),
      );
      // Reload recents into the store so open() picks them up
      const s = (window as any).searchStore;
      if (s?.recents !== undefined) {
        s.recents = recents;
      }
    });

    // Open modal via store API
    await page.evaluate(() => (window as any).searchStore?.open());

    const resultItem = page
      .getByTestId("search-result")
      .filter({ hasText: "Recent Note" });
    await expect(resultItem).toBeVisible();
    await expect(resultItem).toContainText("recent-note.md");
  });
});

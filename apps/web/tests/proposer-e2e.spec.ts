import { test, expect } from "@playwright/test";

async function waitForSearchIndexing(page: any, names: string[]) {
  for (const name of names) {
    await page.waitForFunction(
      async (n: string) => {
        const s = (window as any).searchStore;
        if (!s?.setQuery) return false;
        try {
          await s.setQuery(n);
          return Array.isArray(s.results) && s.results.length > 0;
        } catch {
          return false;
        }
      },
      name,
      { timeout: 15000 },
    );
  }
  await page.evaluate(() => (window as any).searchStore?.setQuery(""));
}

test.describe("Connections Proposer E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Debugging: Log page console messages
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.error("PAGE ERROR:", msg.text());
      } else {
        console.log("PAGE LOG:", msg.text());
      }
    });

    // Mock Gemini response early to ensure interception
    await page.route("**/v1beta/models/**", async (route) => {
      console.log(`MOCKING AI RESPONSE for URL: ${route.request().url()}`);

      const url = route.request().url();
      if (url.includes("generateContent")) {
        const response = {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify([
                      {
                        targetId: "the-broken-tower",
                        type: "located_at",
                        reason: "Semantic link detected.",
                        context: "at The Broken Tower",
                        confidence: 0.95,
                      },
                    ]),
                  },
                ],
              },
            },
          ],
        };
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(response),
        });
      } else {
        await route.continue();
      }
    });

    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );
      (window as any).__SHARED_GEMINI_KEY__ = "mock-api-key";
    });

    await page.goto("/");

    // Wait for vault to be attached to window and then for it to be idle
    await page.waitForFunction(
      () => {
        const v = (window as any).vault;
        return v && v.isInitialized && v.status === "idle";
      },
      { timeout: 60000 },
    );
  });

  test("Should suggest and apply a semantic connection", async ({ page }) => {
    test.slow();

    // 1. Create two entities
    await page.getByTestId("new-entity-button").click();
    await page.getByTestId("new-entity-title-input").fill("Eldrin the Wise");
    await page.getByRole("button", { exact: true, name: "ADD" }).click();

    // Wait for form to close
    await expect(page.getByTestId("new-entity-title-input")).not.toBeVisible();

    await page.getByTestId("new-entity-button").click();
    await page.getByTestId("new-entity-title-input").fill("The Broken Tower");
    await page.getByRole("button", { exact: true, name: "ADD" }).click();

    // Wait for form to close
    await expect(page.getByTestId("new-entity-title-input")).not.toBeVisible();

    // Wait for vault to be idle and search indexing
    await page.waitForFunction(() => (window as any).vault.status === "idle");
    await waitForSearchIndexing(page, ["Eldrin the Wise", "The Broken Tower"]);

    // 2. Add content to Eldrin
    await page.evaluate(() => (window as any).searchStore?.open());
    const searchInput = page.getByPlaceholder("Search notes...");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Eldrin");
    await page.getByTestId("search-result").first().click();

    await page.getByRole("button", { name: "EDIT" }).first().click();
    const editor = page.locator(".tiptap[contenteditable='true']");
    await editor.fill("Eldrin spent many years studying at The Broken Tower.");
    await page.getByRole("button", { name: "SAVE CHANGES" }).click();

    // Wait for vault to be idle
    await page.waitForFunction(() => (window as any).vault.status === "idle");

    // 4. Wait for suggestion to appear
    await expect(page.getByText("Oracle Suggestions")).toBeVisible({
      timeout: 30000,
    });

    // Specifically look for the title in the proposal card
    const proposalCard = page.locator(".group", {
      has: page.getByText("The Broken Tower"),
    });
    await expect(proposalCard).toBeVisible();

    // 5. Apply
    await proposalCard.getByTitle("Apply Connection").click();

    // 6. Verify connection in Gossip section
    await expect(
      page.locator("li", { hasText: /located_(at|in)/ }),
    ).toContainText("The Broken Tower");

    // 7. Verify proposal list updates
    await expect(page.getByText("Oracle Suggestions")).not.toBeVisible();
  });

  test("Should dismiss a suggestion and show it in history", async ({
    page,
  }) => {
    test.slow();

    // Setup
    await page.getByTestId("new-entity-button").click();
    await page.getByTestId("new-entity-title-input").fill("Alaric");
    await page.getByRole("button", { exact: true, name: "ADD" }).click();

    // Wait for form to close
    await expect(page.getByTestId("new-entity-title-input")).not.toBeVisible();

    await page.getByTestId("new-entity-button").click();
    await page.getByTestId("new-entity-title-input").fill("The Broken Tower");
    await page.getByRole("button", { exact: true, name: "ADD" }).click();

    // Wait for form to close
    await expect(page.getByTestId("new-entity-title-input")).not.toBeVisible();

    // Wait for vault to be idle and search indexing
    await page.waitForFunction(() => (window as any).vault.status === "idle");
    await waitForSearchIndexing(page, ["Alaric", "The Broken Tower"]);

    // Add content to Alaric to trigger proposer
    await page.evaluate(() => (window as any).searchStore?.open());
    const searchInput2 = page.getByPlaceholder("Search notes...");
    await expect(searchInput2).toBeVisible();
    await searchInput2.fill("Alaric");
    await page.getByTestId("search-result").first().click();

    await page.getByRole("button", { name: "EDIT" }).first().click();
    await page
      .locator(".tiptap[contenteditable='true']")
      .fill("Alaric was a regular visitor to The Broken Tower.");
    await page.getByRole("button", { name: "SAVE CHANGES" }).click();

    // Wait for vault to be idle
    await page.waitForFunction(() => (window as any).vault.status === "idle");

    await expect(page.getByText("Oracle Suggestions")).toBeVisible({
      timeout: 30000,
    });

    const proposalCard = page.locator(".group", {
      has: page.getByText("The Broken Tower"),
    });
    await expect(proposalCard).toBeVisible();

    // Dismiss
    await proposalCard.getByTitle("Dismiss").click();
    await expect(proposalCard).not.toBeVisible();

    // History
    await page
      .getByRole("button", { name: /Show Dismissed Proposals/ })
      .click();
    await expect(
      page.locator(".text-theme-muted.line-through", {
        hasText: "The Broken Tower",
      }),
    ).toBeVisible();

    // Restore (Re-evaluate)
    await page.getByRole("button", { name: "Re-evaluate" }).click();
    await expect(
      page.locator(".group", { has: page.getByText("The Broken Tower") }),
    ).toBeVisible();
  });
});

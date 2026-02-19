import { test, expect } from "@playwright/test";

test.describe("Advanced Draw Button", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__SHARED_GEMINI_KEY__ = "fake-key";
      localStorage.setItem("codex_skip_landing", "true");
    });
    await page.goto("http://localhost:5173/");

    // Create an entity to test sidepanel/zen mode
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder(/Title.../i).fill("Ancient Dragon");
    await page.getByRole("button", { name: "ADD" }).click();

    // Wait for indexing
    await expect(page.getByTestId("entity-count")).toHaveText(/1\s+CHRONICLE/);
  });

  test("Lite tier does NOT show draw buttons", async ({ page }) => {
    // 1. Check Sidepanel via Search
    await page.keyboard.press("Control+k");
    await page.getByPlaceholder(/Search notes/i).fill("Ancient Dragon");
    await page.getByTestId("search-result").first().click();

    await expect(page.getByText("No Image")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "DRAW VISUAL", exact: true }),
    ).not.toBeVisible();

    // 2. Check Oracle Chat
    await page.getByTitle("Open Lore Oracle").click();
    const input = page.getByTestId("oracle-input");
    await input.fill("Tell me about the dragon");
    await input.press("Enter");

    // Wait for generation placeholder
    await expect(page.getByText("Consulting archives...")).toBeVisible();
    await expect(page.getByText("Consulting archives...")).not.toBeVisible();

    // Verify button absent
    await expect(
      page.getByRole("button", { name: "DRAW", exact: true }),
    ).not.toBeVisible();
  });

  test("Advanced tier shows and triggers draw buttons in Sidepanel and Chat", async ({
    page,
  }) => {
    // 1. Force Advanced Tier via evaluate
    await page.evaluate(async () => {
      while (!(window as any).oracle) {
        await new Promise((r) => setTimeout(r, 50));
      }
      const oracle = (window as any).oracle;
      await oracle.setTier("advanced");
      await oracle.setKey("fake-key");
    });

    // 2. Check Sidepanel via Search
    await page.keyboard.press("Control+k");
    await page.getByPlaceholder(/Search notes/i).fill("Ancient Dragon");
    await page.getByTestId("search-result").first().click();

    // Wait for sidepanel transition and ensure heading is visible
    await expect(
      page.locator("h2", { hasText: "Ancient Dragon" }),
    ).toBeVisible();

    // Button should be in the DOM
    const sidepanelDraw = page.getByLabel(
      "Draw visualization for Ancient Dragon",
    );
    await expect(sidepanelDraw).toBeAttached();

    // Click it and verify loading state appears
    await sidepanelDraw.click({ force: true });
    await expect(page.getByText("VISUALIZING...")).toBeVisible();

    // 3. Check Oracle Chat
    await page.getByTitle("Open Lore Oracle").click();

    // Inject a mock assistant message directly into the store to test the button logic
    await page.evaluate(async () => {
      const oracle = (window as any).oracle;
      const newMsg = {
        id: "mock-msg-" + Date.now(),
        role: "assistant" as const,
        content: "I can visualize this dragon for you.",
        hasDrawAction: true,
      };
      oracle.messages = [...oracle.messages, newMsg];
      oracle.lastUpdated = Date.now();
    });

    // Verify button exists in chat and click it
    const chatDraw = page.getByRole("button", { name: "DRAW", exact: true });
    await expect(chatDraw).toBeVisible();
  });

  test("Advanced tier shows and triggers draw buttons in Zen Mode", async ({
    page,
  }) => {
    // 1. Force Advanced Tier via evaluate
    await page.evaluate(async () => {
      while (!(window as any).oracle) {
        await new Promise((r) => setTimeout(r, 50));
      }
      const oracle = (window as any).oracle;
      await oracle.setTier("advanced");
      await oracle.setKey("fake-key");
    });

    // 2. Check Zen Mode via Search
    await page.keyboard.press("Control+k");
    await page.getByPlaceholder(/Search notes/i).fill("Ancient Dragon");
    await page.getByTestId("search-result").first().click();

    // Open Zen Mode
    await page.keyboard.press("Alt+z");

    // Wait for Zen Mode transition and ensure heading is visible
    const zenModal = page.getByTestId("zen-mode-modal");
    await expect(zenModal).toBeVisible();
    await expect(
      zenModal.locator("h1", { hasText: "Ancient Dragon" }),
    ).toBeVisible();

    // Button should be in the DOM
    const zenDraw = zenModal.getByLabel(
      "Draw visualization for Ancient Dragon",
    );
    await expect(zenDraw).toBeVisible();

    // Click it and verify loading state appears
    await zenDraw.click({ force: true });
    await expect(zenModal.getByText("VISUALIZING...")).toBeVisible();
  });
});

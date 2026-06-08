import { test, expect } from "@playwright/test";

test.describe("AI Entity Regeneration", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );
      (window as any).__SHARED_GEMINI_KEY__ = "fake-key";
      try {
        localStorage.setItem("codex_skip_landing", "true");
        localStorage.setItem("codex_ai_disabled", "false");
      } catch {
        /* ignore */
      }
    });

    await page.goto("/");
    await page.waitForFunction(() => (window as any).vault !== undefined);
  });

  test("should show regenerate button for host and trigger flow", async ({
    page,
  }) => {
    // 1. Create a mock entity
    await page.evaluate(async () => {
      const vault = (window as any).vault;
      await vault.createEntity("npc", "Test Hero", {
        content: "Initial chronicle",
        lore: "Initial lore",
      });
    });

    // Wait for UI to reflect creation
    await expect(page.getByTestId("entity-count")).toBeVisible({
      timeout: 15000,
    });

    // 2. Open the entity
    const heroLink = page
      .getByTestId("entity-list-item")
      .filter({ hasText: "Test Hero" })
      .first();
    await expect(heroLink).toBeVisible({ timeout: 15000 });
    await heroLink.click();
    await expect(page.getByText("Initial chronicle")).toBeVisible();

    // 3. Verify AI Regen button exists
    const regenButton = page.getByLabel("AI Regenerate Description");
    await expect(regenButton).toBeVisible();

    // 4. Mock AI Response
    await page.route(
      /.*\/v1beta\/models\/.*:streamGenerateContent.*/,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body: `data: {"candidates": [{"content": {"parts": [{"text": "### CHRONICLE\nNew atmospheric chronicle.\n\n### LORE\nNew detailed lore with secrets."}]}}]}

`,
        });
      },
    );

    // 5. Trigger Regeneration
    await regenButton.click();

    // 6. Verify Preview State
    await expect(page.locator("text=AI Suggestion Ready")).toBeVisible();
    await expect(page.locator("text=Proposed")).toHaveCount(1); // At least in active tab

    // 7. Check Chronicle Preview
    await expect(page.locator("text=New atmospheric chronicle.")).toBeVisible();

    // 8. Switch to Lore Tab and check preview
    // Note: Tab names depend on theme, but usually "Lore" or jargon
    await page.click('[role="tab"]:has-text("Lore")');
    await expect(
      page.locator("text=New detailed lore with secrets."),
    ).toBeVisible();

    // 9. Accept Changes
    await page.click('button:has-text("Apply Changes")');

    // 10. Verify persistence
    await expect(page.locator("text=AI Suggestion Ready")).not.toBeVisible();
    await expect(page.locator("text=New atmospheric chronicle.")).toBeVisible();
  });
});

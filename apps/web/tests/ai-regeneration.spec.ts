import { test, expect } from "@playwright/test";
import {
  openEntitySidepanel,
  seedEntity,
  setupVaultPage,
} from "./test-helpers";

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
        localStorage.setItem("codex_ai_disabled", "false");
      } catch {
        /* ignore */
      }
    });

    await setupVaultPage(page);
  });

  test("should show regenerate button for host and trigger flow", async ({
    page,
  }) => {
    // 1. Create a mock entity
    const heroId = await seedEntity(page, {
      type: "npc",
      title: "Test Hero",
      content: "Initial chronicle",
      data: {
        lore: "Initial lore",
      },
    });

    // Wait for UI to reflect creation
    await expect(page.getByTestId("entity-count")).toBeVisible({
      timeout: 15000,
    });

    // 2. Open the entity
    await openEntitySidepanel(page, heroId);
    await expect(page.getByText("Initial chronicle")).toBeVisible();

    // 3. Verify AI Regen button exists
    const sidePanel = page.getByRole("complementary");
    const regenButton = sidePanel.getByLabel("AI Revise Description").last();
    await expect(regenButton).toBeVisible();

    // 4. Mock AI revision response at the Oracle boundary
    await page.evaluate(() => {
      (window as any).oracle.reviseEntity = async () => ({
        content: "New atmospheric chronicle.",
        lore: "New detailed lore with secrets.",
      });
    });

    // 5. Trigger Regeneration
    await regenButton.click();
    const revisionDialog = page.getByRole("dialog", {
      name: "Revise Description",
    });
    await expect(revisionDialog).toBeVisible();
    await revisionDialog.getByRole("button", { name: "Revise" }).click();

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
    await page.getByRole("tab", { name: "STATUS" }).click();
    await expect(page.locator("text=New atmospheric chronicle.")).toBeVisible();
  });
});

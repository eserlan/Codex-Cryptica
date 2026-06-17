import { test, expect } from "@playwright/test";
import { seedEntities, setupVaultPage } from "./test-helpers";

test.describe("Graph Connection Labels & Colors", () => {
  test("should allow changing connection type and see color indication (indirectly via label)", async ({
    page,
  }) => {
    await setupVaultPage(page);
    await seedEntities(page, [
      { type: "character", title: "Test Source" },
      { type: "character", title: "Test Target" },
    ]);

    // Connect entities via vault API
    await page.evaluate(async () => {
      const vault = (window as any).vault;
      const source = Object.values(vault.entities).find(
        (e: any) => e.title === "Test Source",
      ) as any;
      const target = Object.values(vault.entities).find(
        (e: any) => e.title === "Test Target",
      ) as any;
      if (source && target) {
        await vault.addConnection(source.id, target.id, "neutral");
      }
    });

    // Open Source Entity via search
    await page.keyboard.press("Control+k");
    await page.getByPlaceholder("Search notes...").fill("Test Source");
    await page
      .getByTestId("search-result")
      .filter({ hasText: "Test Source" })
      .click();

    // Find connection in list
    const connectionItem = page.locator("li", { hasText: "Test Target" });
    await expect(connectionItem).toBeVisible({ timeout: 10000 });

    // Click Edit (pencil) - might need hover
    await connectionItem.hover();
    await connectionItem.getByLabel("Edit connection").click();

    // Change to Enemy
    await page.locator("select").selectOption("enemy");

    // Add Label
    await page
      .getByPlaceholder("e.g. Brother, Rival, Employer")
      .fill("Nemesis");

    // Save
    await page
      .getByTestId("entity-detail-panel")
      .getByRole("button", { name: "SAVE" })
      .click();

    // Verify UI update
    await expect(page.getByText("Nemesis")).toBeVisible();
  });
});

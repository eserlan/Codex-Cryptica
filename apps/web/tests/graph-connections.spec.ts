import { test, expect } from "@playwright/test";

test.describe("Graph Connection Labels & Colors", () => {
  test("should allow changing connection type and see color indication (indirectly via label)", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
    });

    await page.goto("/");
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 10000,
    });

    // Create two entities using the correct UI flow
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Test Source");
    await page.getByRole("button", { name: "ADD" }).click();

    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Test Target");
    await page.getByRole("button", { name: "ADD" }).click();

    // Wait for entities to be created
    await expect(page.getByTestId("entity-count")).toHaveText("2 ENTITIES", {
      timeout: 10000,
    });

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
    await page.getByRole("button", { name: "SAVE" }).click();

    // Verify UI update
    await expect(page.getByText("Nemesis")).toBeVisible();
  });
});

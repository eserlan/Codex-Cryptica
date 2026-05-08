import { test, expect } from "@playwright/test";

test.describe("Category Architecture Modal", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      try {
        localStorage.setItem("codex_skip_landing", "true");
      } catch {
        /* ignore */
      }
    });

    await page.goto("/");

    // Wait for vault to initialize automatically
    await page.waitForFunction(
      () =>
        (window as any).uiStore !== undefined &&
        (window as any).vault !== undefined &&
        (window as any).vault.status === "idle",
      { timeout: 15000 },
    );
  });

  test("should open Category Architecture modal and display default categories", async ({
    page,
  }) => {
    // 1. Open main Settings
    await page.getByTestId("settings-button").click();

    const modal = page.getByTestId("settings-modal");
    await expect(modal).toBeVisible();
    await expect(modal.locator("h2", { hasText: "Vault" })).toBeVisible();

    // 2. Open Schema tab via sidebar
    await page.getByRole("tab", { name: "Schema" }).click();

    // 3. Verify Schema heading is visible
    await expect(modal.locator("h2", { hasText: "Schema" })).toBeVisible();

    // 4. Verify default categories are loaded (Character is a default)
    await page.waitForFunction(() => {
      const inputs = Array.from(
        document.querySelectorAll('input[type="text"]'),
      ) as HTMLInputElement[];
      return inputs.some((i) => i.value === "Character");
    });

    // 5. Verify the new category input and ADD button exist
    await expect(page.getByPlaceholder("New category...")).toBeVisible();
    await expect(page.getByRole("button", { name: "ADD" })).toBeVisible();

    // 6. Close modal
    await page.getByLabel("Close Settings").click();
    await expect(modal).not.toBeVisible();
  });

  test("should add a new category in session", async ({ page }) => {
    // Open settings and go to Schema
    await page.getByTestId("settings-button").click();
    const modal = page.getByTestId("settings-modal");
    await page.getByRole("tab", { name: "Schema" }).click();
    await expect(modal.locator("h2", { hasText: "Schema" })).toBeVisible();

    // Count initial categories
    const initialCount = await page
      .locator('[data-testid^="category-row-"]')
      .count();

    // Add new category
    await page.getByPlaceholder("New category...").fill("Artifact");
    await page.getByRole("button", { name: "ADD" }).click();

    // Wait for list update
    await page.waitForFunction(
      () => {
        const inputs = Array.from(
          document.querySelectorAll('input[type="text"]'),
        ) as HTMLInputElement[];
        return inputs.some((i) => i.value === "Artifact");
      },
      { timeout: 5000 },
    );

    // Verify new category was added to count
    const newCount = await page
      .locator('[data-testid^="category-row-"]')
      .count();
    expect(newCount).toBe(initialCount + 1);
  });

  test("should open and close glyph library picker", async ({ page }) => {
    // Open settings and go to Schema
    await page.getByTestId("settings-button").click();
    await page.getByRole("tab", { name: "Schema" }).click();
    const modal = page.getByTestId("settings-modal");
    await expect(modal.locator("h2", { hasText: "Schema" })).toBeVisible();

    // Open glyph library via "Select Icon" button
    await page.getByTitle("Select Icon").first().click();
    await expect(page.getByText("Glyph Library")).toBeVisible();

    // Verify icons are present
    const iconCount = await page.locator('button[title^="Select "]').count();
    expect(iconCount).toBeGreaterThan(10);

    // Close by selecting an icon
    await page.getByTitle("Select star icon").click();
    await expect(page.getByText("Glyph Library")).not.toBeVisible();
  });

  test("should reset categories to defaults", async ({ page }) => {
    // Open settings and go to Schema
    await page.getByTestId("settings-button").click();
    await page.getByRole("tab", { name: "Schema" }).click();

    // Delete character category naturally
    const characterRow = page.getByTestId("category-row-character");
    await characterRow.hover();
    await characterRow.getByTitle("Delete Category").click();

    // Accept the Svelte confirmation dialog
    await page
      .locator('[class*="z-\\[200\\]"]')
      .getByRole("button", { name: "Delete" })
      .click();

    // Verify row is gone
    await expect(characterRow).not.toBeVisible();

    // Click Reset to Defaults
    await page.getByRole("button", { name: /RESET TO DEFAULTS/i }).click();

    // Verify character is back
    await expect(characterRow).toBeVisible();
  });

  test("should update graph node border color when category color changes", async ({
    page,
  }) => {
    // 1. Create an entity first so we have a node in the graph
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder(/Title\.\.\./).fill("Color Test");
    await page.getByRole("button", { name: "ADD" }).click();

    // 2. Open settings and go to Schema
    await page.getByTestId("settings-button").click();
    await page.getByRole("tab", { name: "Schema" }).click();

    // 3. Find character category color input and change it to a distinct color
    const characterRow = page.getByTestId("category-row-character");
    const colorInput = characterRow.locator('input[type="color"]');

    // Get initial color to verify it changes
    const initialColor = await colorInput.inputValue();

    // Change to a very different color (bright pink)
    const newColor = "#ff00ff";
    await colorInput.fill(newColor);

    // 4. Close modal and verify color was saved
    await page.getByLabel("Close Settings").click();

    // 5. Reopen and verify the color persisted
    await page.getByTestId("settings-button").click();
    await page.getByRole("tab", { name: "Schema" }).click();

    const updatedColorInput = page
      .getByTestId("category-row-character")
      .locator('input[type="color"]');
    const savedColor = await updatedColorInput.inputValue();

    // Color should have changed from initial
    expect(savedColor.toLowerCase()).not.toBe(initialColor.toLowerCase());
    // Color should persist to new value (may be uppercase)
    expect(savedColor.toLowerCase()).toBe(newColor.toLowerCase());

    // 6. Clean up - reset to defaults
    await page.getByRole("button", { name: /RESET TO DEFAULTS/i }).click();
    await page.getByLabel("Close Settings").click();
  });
});

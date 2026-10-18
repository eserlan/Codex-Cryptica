import { test, expect, type Page } from "@playwright/test";
import { setupVaultPage, seedEntity } from "./test-helpers";

const openEntityForTest = async (page: Page, id = "test-event") => {
  await page.evaluate((entityId) => {
    const vault = (window as any).vault;
    if (vault) vault.selectedEntityId = entityId;
  }, id);
};

test.describe("Campaign Date Picker E2E", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);

    // Setup: Create a test entity reliably
    await seedEntity(page, {
      id: "test-event",
      title: "Test Event",
      type: "event",
      select: true,
    });
  });

  test("should open date picker and select a year via Era", async ({
    page,
  }) => {
    // 1. Setup an Era first in Settings
    await page.getByTestId("settings-button").click();

    // Wait for modal
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Switch to AI tab (where Eras usually are)
    await page.getByRole("tab", { name: "AI" }).click();

    await page.getByTestId("era-name-input").fill("Age of Myth");
    await page.getByTestId("era-start-input").fill("1000");
    await page.getByTestId("initialize-era-button").click();

    // Wait for the era to appear in the settings list (confirms graph store update)
    await expect(
      page.locator(".space-y-2").getByText("Age of Myth"),
    ).toBeVisible();

    await page.getByLabel("Close Settings").click();

    // 2. Open Zen Mode for the entity
    await openEntityForTest(page, "test-event");
    await page
      .locator(".hidden.md\\:flex")
      .getByTestId("enter-zen-mode-button")
      .click();
    await expect(page.getByTestId("zen-mode-modal")).toBeVisible();
    await page.getByTestId("edit-entity-button").click();

    // 3. Open Date Picker
    await page.locator('button:has-text("No date set...")').first().click({
      force: true,
    });

    // 4. Select Era Tab
    await page.locator("#era-tab").click({ force: true });
    await page
      .getByTestId("era-select-button")
      .filter({ hasText: "Age of Myth" })
      .click({ force: true });

    // 5. Verify Year grid highlights 1000
    await expect(
      page.getByRole("option", { name: "1000", exact: true }),
    ).toHaveClass(/text-theme-primary/);

    // 6. Apply
    await page
      .getByTestId("apply-date-button")
      .evaluate((el) => (el as HTMLElement).click());
    await expect(page.locator('button:has-text("1000")').first()).toHaveText(
      /^1000(\s+\S+)?\s*$/,
    );
  });

  test("should support custom month names", async ({ page }) => {
    // 1. Configure custom calendar in Settings
    await page.getByTestId("settings-button").click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.getByRole("tab", { name: /vault/i }).click();

    // Toggle Gregorian off
    const gregorianToggle = page.getByTestId("gregorian-toggle");
    await gregorianToggle.uncheck();

    // Add custom month
    await page.click('button:has-text("+ ADD MONTH")');
    const monthInputs = page.getByTestId("month-name-input");
    await monthInputs.first().fill("Hammer");
    await monthInputs.first().press("Enter"); // Ensure change event fires

    await page.getByLabel("Close Settings").click();

    // 2. Open Zen Mode and Date Picker
    await openEntityForTest(page, "test-event");
    await page
      .locator(".hidden.md\\:flex")
      .getByTestId("enter-zen-mode-button")
      .click();
    await expect(page.getByTestId("zen-mode-modal")).toBeVisible();
    await page.getByTestId("edit-entity-button").click({ force: true });
    await page.locator('button:has-text("No date set...")').first().click({
      force: true,
    });

    // Zoom into Detail/Month view
    await page.locator("#manual-tab").click({ force: true });

    // 3. Verify custom month appears in dropdown
    await page
      .getByRole("button", { name: "unit", exact: true })
      .click({ force: true });
    await page
      .getByRole("option", { name: "Hammer", exact: true })
      .click({ force: true });
    await page
      .getByTestId("apply-date-button")
      .evaluate((el) => (el as HTMLElement).click());

    // 4. Verify formatting: default year is 0 when only a month is selected.
    await expect(
      page.locator('button:has-text("Hammer 0")').first(),
    ).toBeVisible();

    // 5. Verify the underlying year value is explicitly set to 0 in the grid view.
    await page.click('button:has-text("Hammer 0")');
    await page.getByRole("tab", { name: "Detail" }).click({ force: true });
    await expect(
      page.getByRole("option", { name: "0", exact: true }),
    ).toHaveClass(/text-theme-primary/);
  });

  test("should allow selecting years via scroll wheel listbox", async ({
    page,
  }) => {
    await openEntityForTest(page, "test-event");
    await page
      .locator(".hidden.md\\:flex")
      .getByTestId("enter-zen-mode-button")
      .click();
    await expect(page.getByTestId("zen-mode-modal")).toBeVisible();
    await page.getByTestId("edit-entity-button").click();
    await page
      .locator('button:has-text("No date set...")')
      .first()
      .click({ force: true });
    await page.locator("#manual-tab").click({ force: true });

    // Select year 5 in the listbox column
    await page
      .getByRole("option", { name: "5", exact: true })
      .click({ force: true });

    // Verify option 5 has selected class
    await expect(
      page.getByRole("option", { name: "5", exact: true }),
    ).toHaveClass(/text-theme-primary/);

    // Click Apply
    await page
      .getByTestId("apply-date-button")
      .evaluate((el) => (el as HTMLElement).click());

    // Verify formatted year is visible
    await expect(page.locator('button:has-text("5")').first()).toBeVisible();
  });

  test("should allow manual year entry via keyboard toggle", async ({
    page,
  }) => {
    await openEntityForTest(page, "test-event");
    await page
      .locator(".hidden.md\\:flex")
      .getByTestId("enter-zen-mode-button")
      .click();
    await expect(page.getByTestId("zen-mode-modal")).toBeVisible();
    await page.getByTestId("edit-entity-button").click();
    await page
      .locator('button:has-text("No date set...")')
      .first()
      .click({ force: true });
    await page.locator("#manual-tab").click({ force: true });

    // 1. Toggle manual entry
    await page.getByLabel("Direct jump to Year").click({ force: true });
    const manualInput = page.getByPlaceholder("Type...");
    await manualInput.focus();
    await expect(manualInput).toBeFocused();

    // 2. Type a year
    await manualInput.fill("2026");
    await manualInput.press("Enter");
    await page
      .getByTestId("apply-date-button")
      .evaluate((el) => (el as HTMLElement).click());

    // 3. Verify
    await expect(page.locator('button:has-text("2026")').first()).toBeVisible();
  });
});

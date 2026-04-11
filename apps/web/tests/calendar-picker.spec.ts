import { test, expect, type Page } from "@playwright/test";

/**
 * Programmatic node click for high reliability in E2E tests.
 * Standard mouse clicks on Canvas elements are often flaky due to
 * DPI scaling, scroll positions, or animation timing.
 */
const clickNodeProgrammatically = async (page: Page, label: string) => {
  await page.waitForFunction(
    (label: string) => {
      const cy = (window as any).cy;
      if (!cy) return false;
      const node = cy.nodes().filter((n: any) => n.data("label") === label);
      return node.length > 0;
    },
    label,
    { timeout: 15000 },
  );

  await page.evaluate((label) => {
    const cy = (window as any).cy;
    const node = cy
      .nodes()
      .filter((n: any) => n.data("label") === label)
      .first();
    // Programmatically trigger selection and click events
    cy.nodes().unselect();
    node.select();
    node.trigger("tap");
    node.trigger("click");
  }, label);

  // Check if detail panel appeared
  await expect(page.getByTestId("entity-detail-panel")).toBeVisible({
    timeout: 10000,
  });
};

test.describe("Campaign Date Picker E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__E2E__ = true;
      (window as any).DISABLE_ONBOARDING = true;
      try {
        localStorage.setItem("codex_skip_landing", "true");
      } catch {
        /* ignore */
      }
      (window as any).DISABLE_ERROR_OVERLAY = true;
      (window as any).showDirectoryPicker = async () => ({
        kind: "directory",
        name: "test-vault",
        requestPermission: async () => "granted",
        queryPermission: async () => "granted",
        values: async function* () {},
        entries: async function* () {},
        getDirectoryHandle: async () => ({
          kind: "directory",
          entries: async function* () {},
          getFileHandle: async () => ({
            kind: "file",
            createWritable: async () => ({
              write: async () => {},
              close: async () => {},
            }),
          }),
        }),
      });
    });

    await page.goto("/");

    // Wait for core system to be ready
    await page.waitForFunction(
      () =>
        (window as any).uiStore !== undefined &&
        (window as any).vault !== undefined &&
        (window as any).vault.status === "idle",
      { timeout: 15000 },
    );
    await page.evaluate(() => {
      const ui = (window as any).uiStore;
      if (ui) {
        ui.dismissedWorldPage = true;
        ui.isLandingPageVisible = false;
      }
    });

    // Setup: Create a test entity
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder(/Title\.\.\./).fill("Test Event");
    await page.getByRole("button", { name: "ADD" }).click();

    // Ensure node is in graph
    await page.waitForFunction(() => {
      const cy = (window as any).cy;
      return cy && cy.nodes().length >= 1;
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
    await clickNodeProgrammatically(page, "Test Event");
    await page.getByTestId("enter-zen-mode-button").click();
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
      page.getByRole("button", { name: "1000", exact: true }),
    ).toHaveClass(/bg-theme-primary/);

    // 6. Apply
    await page.getByTestId("apply-date-button").click();
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
    await clickNodeProgrammatically(page, "Test Event");
    await page.getByTestId("enter-zen-mode-button").click();
    await expect(page.getByTestId("zen-mode-modal")).toBeVisible();
    await page.getByTestId("edit-entity-button").click({ force: true });
    await page.locator('button:has-text("No date set...")').first().click({
      force: true,
    });

    // Zoom into Detail/Month view
    await page.locator("#manual-tab").click({ force: true });

    // 3. Verify custom month appears in dropdown
    await page.getByRole("button", { name: "month", exact: true }).click();
    await page.getByTestId("month-selector").selectOption({ label: "Hammer" });
    await page.getByTestId("apply-date-button").click();

    // 4. Verify formatting: default year is 0 when only a month is selected.
    await expect(
      page.locator('button:has-text("Hammer 0")').first(),
    ).toBeVisible();

    // 5. Verify the underlying year value is explicitly set to 0 in the grid view.
    await page.click('button:has-text("Hammer 0")');
    await page.getByRole("tab", { name: "Detail" }).click({ force: true });
    await expect(
      page.getByRole("button", { name: "0", exact: true }),
    ).toHaveClass(/bg-theme-primary/);
  });

  test("should allow navigating years via pure UI grid", async ({ page }) => {
    await clickNodeProgrammatically(page, "Test Event");
    await page.getByTestId("enter-zen-mode-button").click();
    await expect(page.getByTestId("zen-mode-modal")).toBeVisible();
    await page.getByTestId("edit-entity-button").click();
    await page.click('button:has-text("No date set...")');
    await page.click('button:has-text("Detail")');

    // 1. Initial view should show 0-11
    await expect(
      page.getByRole("button", { name: "0", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "11", exact: true }),
    ).toBeVisible();

    // 2. Zoom out to decades
    await page.click('button:has-text("0 - 11")');
    await expect(
      page.getByRole("button", { name: "0", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "110", exact: true }),
    ).toBeVisible();

    // 3. Select decade 100
    await page.click('button:has-text("100")');
    await expect(
      page.getByRole("button", { name: "100", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "111", exact: true }),
    ).toBeVisible();

    // 4. Select year 105
    await page.click('button:has-text("105")');
    await page.getByTestId("apply-date-button").click();
    await expect(page.locator('button:has-text("105")').first()).toBeVisible();
  });

  test("should allow manual year entry via keyboard toggle", async ({
    page,
  }) => {
    await clickNodeProgrammatically(page, "Test Event");
    await page.getByTestId("enter-zen-mode-button").click();
    await expect(page.getByTestId("zen-mode-modal")).toBeVisible();
    await page.getByTestId("edit-entity-button").click();
    await page.click('button:has-text("No date set...")');
    await page.click('button:has-text("Detail")');

    // 1. Toggle manual entry
    await page.getByLabel("Toggle Manual Entry").click();
    await expect(page.locator("#manual-year-input")).toBeFocused();

    // 2. Type a year
    await page.locator("#manual-year-input").fill("2026");
    await page.getByTestId("apply-date-button").click();

    // 3. Verify
    await expect(page.locator('button:has-text("2026")').first()).toBeVisible();
  });
});

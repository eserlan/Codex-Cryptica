import { test, expect, type Page } from "@playwright/test";

const clickNodeOnCanvas = async (page: Page, label: string) => {
  // Wait for the node to exist in Cytoscape
  await page.waitForFunction(
    (label: string) => {
      const cy = (window as any).cy;
      if (!cy) return false;
      return (
        cy.nodes().filter((n: any) => n.data("label") === label).length > 0
      );
    },
    label,
    { timeout: 10000 },
  );

  const position = await page.evaluate((label: string) => {
    const cy = (window as any).cy;
    const node = cy.nodes().filter((n: any) => n.data("label") === label);
    const pos = node.renderedPosition();
    return { x: pos.x, y: pos.y };
  }, label);

  const canvasBox = await page.getByTestId("graph-canvas").boundingBox();
  if (!canvasBox) throw new Error("Graph canvas not found");

  await page.mouse.click(canvasBox.x + position.x, canvasBox.y + position.y);
  // Wait for the panel to transition in
  await page.waitForTimeout(500);
};

test.describe("Campaign Date Picker E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__E2E__ = true;
      (window as any).DISABLE_ONBOARDING = true;
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

    await page.goto("http://localhost:5173/");
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
    await page.waitForFunction(() => (window as any).uiStore !== undefined);

    // Inject mocks
    await page.evaluate(() => {
      const v = (window as any).vault;
      v.getActiveVaultHandle = async () => ({ kind: "directory" });
      v.init = async () => {};
      v.loadFiles = async () => {};
      v.status = "idle";

      const c = (window as any).calendarStore;
      c.init = async () => {};
    });

    // Setup: Create a test entity
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Test Event");
    await page.getByRole("button", { name: "ADD" }).click();
  });

  test("should open date picker and select a year via Era", async ({
    page,
  }) => {
    // 1. Setup an Era first in Settings
    await page.getByTestId("settings-button").click();
    await page.getByRole("tab", { name: "Intelligence" }).click();
    await page.getByTestId("era-name-input").fill("Age of Myth");
    await page.getByTestId("era-start-input").fill("1000");
    await page.getByTestId("initialize-era-button").click();
    await page.getByLabel("Close Settings").click();

    // 2. Open Zen Mode for the entity
    await clickNodeOnCanvas(page, "Test Event");
    await expect(page.getByTestId("entity-detail-panel")).toBeVisible();
    await page.getByTestId("enter-zen-mode-button").click();
    await expect(page.getByTestId("zen-mode-modal")).toBeVisible();
    await page.getByTestId("edit-entity-button").click();

    // 3. Open Date Picker
    await page.click('button:has-text("No date set...")');
    await expect(page.locator("text=Eras")).toBeVisible();

    // 4. Select Era
    await page.getByRole("tab", { name: "Eras" }).click();
    await page
      .getByTestId("era-select-button")
      .filter({ hasText: "Age of Myth" })
      .click();

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
    await page.getByRole("tab", { name: "Vault" }).click();

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
    await clickNodeOnCanvas(page, "Test Event");
    await expect(page.getByTestId("entity-detail-panel")).toBeVisible();
    await page.getByTestId("enter-zen-mode-button").click();
    await expect(page.getByTestId("zen-mode-modal")).toBeVisible();
    await page.getByTestId("edit-entity-button").click();
    await page.click('button:has-text("No date set...")');
    await page.click('button:has-text("Detail")');

    // 3. Verify custom month appears in dropdown
    await page.getByRole("button", { name: "month" }).click();
    await page.getByTestId("month-selector").selectOption({ label: "Hammer" });
    await page.getByTestId("apply-date-button").click();

    // 4. Verify formatting: default year is 0 when only a month is selected.
    await expect(
      page.locator('button:has-text("Hammer 0")').first(),
    ).toBeVisible();

    // 5. Verify the underlying year value is explicitly set to 0 in the grid view.
    await page.click('button:has-text("Hammer 0")');
    await page.click('button:has-text("Detail")');
    await expect(
      page.getByRole("button", { name: "0", exact: true }),
    ).toHaveClass(/bg-theme-primary/);
  });

  test("should allow navigating years via pure UI grid", async ({ page }) => {
    await clickNodeOnCanvas(page, "Test Event");
    await expect(page.getByTestId("enter-zen-mode-button")).toBeVisible();
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
});

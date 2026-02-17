import { test, expect, type Page } from "@playwright/test";

const clickNodeOnCanvas = async (page: Page, label: string) => {
  const position = await page.evaluate((label: string) => {
    const cy = (window as any).cy;
    if (!cy) return null;
    const node = cy.nodes().filter((n: any) => n.data("label") === label);
    if (node.length === 0) return null;
    const pos = node.renderedPosition();
    return { x: pos.x, y: pos.y };
  }, label);

  if (!position)
    throw new Error(
      `Node with label "${label}" not found or cy instance missing`,
    );

  const canvasBox = await page.getByTestId("graph-canvas").boundingBox();
  if (!canvasBox) throw new Error("Graph canvas not found");

  await page.mouse.click(canvasBox.x + position.x, canvasBox.y + position.y);
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
    await page.click("text=Age of Myth");

    // 5. Verify Year snapped to 1000 in Detail tab
    await expect(page.locator("#picker-year")).toHaveValue("1000");

    // 6. Apply
    await page.click('button:has-text("Apply")');
    await expect(page.locator('button:has-text("1000")')).toHaveText(
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
    await page.click('button:has-text("Apply")');

    // 4. Verify formatting: default year is 0 when only a month is selected.
    await expect(page.locator('button:has-text("Hammer 0")')).toBeVisible();

    // 5. Verify the underlying year value is explicitly set to 0 in the Detail tab.
    await page.click('button:has-text("Hammer 0")');
    await page.click('button:has-text("Detail")');
    await expect(page.locator("#picker-year")).toHaveValue("0");
  });
});

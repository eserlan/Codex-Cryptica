import { test, expect } from "@playwright/test";

test.describe("Oracle Merge Command E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).showDirectoryPicker = async () => ({
        kind: "directory",
        name: "test-vault",
        requestPermission: async () => "granted",
        queryPermission: async () => "granted",
        values: () => [],
        getDirectoryHandle: async () => ({
          kind: "directory",
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
    await page.waitForFunction(() => (window as any).uiStore !== undefined);

    // Inject fake API key and mock vault methods
    await page.evaluate(() => {
      (window as any).oracle.apiKey = "fake-key";
      const v = (window as any).vault;

      // Mock directory handle to prevent early returns in deleteEntity
      v.getActiveVaultHandle = async () => ({ kind: "directory" });

      // Ensure deleteEntity actually removes from in-memory state for the test
      v.deleteEntity = async (id: string) => {
        delete v.entities[id];
        // Trigger any listeners if necessary (though reactivity handles most)
        v.entities = { ...v.entities };
        return Promise.resolve();
      };
    });
  });

  test("should merge two entities using guided sequence", async ({ page }) => {
    // 1. Create two entities
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Old Hero");
    await page.getByRole("button", { name: "ADD" }).click();

    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Legendary Hero");
    await page.getByRole("button", { name: "ADD" }).click();

    // Wait for indexing to complete (2 entries)
    await expect(page.getByTestId("entity-count")).toHaveText("2 ENTITIES", {
      timeout: 20000,
    });

    // 2. Open Oracle and start merge
    await page.getByTestId("oracle-orb").click();
    const chatInput = page.getByTestId("oracle-input");
    await expect(chatInput).toBeVisible();

    await chatInput.type("/mer");
    await page.keyboard.press("Tab");
    await expect(chatInput).toHaveValue("/merge ");

    // Check if CommandMenu appears with SOURCE (active for /merge)
    await expect(page.getByText("SOURCE", { exact: true })).toBeVisible();

    // 3. Select Source (Old Hero)
    await chatInput.type("Old");
    await expect(page.locator('button:has-text("Old Hero")')).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(chatInput).toHaveValue('/merge "Old Hero" ');

    // 4. Advance to INTO
    await expect(page.getByText("INTO", { exact: true })).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(chatInput).toHaveValue('/merge "Old Hero" into "');

    // 5. Select Target (Legendary Hero)
    await expect(page.getByText("TARGET", { exact: true })).toBeVisible();
    await chatInput.type("Leg");
    await expect(
      page.locator('button:has-text("Legendary Hero")'),
    ).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(chatInput).toHaveValue(
      /\/merge "Old Hero" into "Legendary Hero"\s*/,
    );

    // 6. Finalize in chat (enter)
    await page.keyboard.press("Enter");

    // 7. Verify Success Message
    await expect(
      page.locator("text=Merged Old Hero into Legendary Hero"),
    ).toBeVisible();
    await expect(page.getByTestId("entity-count")).toHaveText("1 ENTITIES", {
      timeout: 10000,
    });

    const entities = await page.evaluate(() =>
      Object.keys((window as any).vault.entities),
    );
    expect(entities).toContain("legendary-hero");
    expect(entities).not.toContain("old-hero");
  });

  test("should use the Merge Wizard via /merge oracle", async ({ page }) => {
    // 1. Create two entities with content
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Source Node");
    await page.getByRole("button", { name: "ADD" }).click();

    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Target Node");
    await page.getByRole("button", { name: "ADD" }).click();

    // Add content via evaluate to bypass editor interaction for speed
    await page.evaluate(() => {
      const v = (window as any).vault;
      v.entities["source-node"].content = "Source content";
      v.entities["target-node"].content = "Target content";
    });

    // 2. Trigger wizard
    await page.getByTestId("oracle-orb").click();
    const chatInput = page.getByTestId("oracle-input");
    await chatInput.fill("/merge oracle");
    await page.keyboard.press("Enter");

    // 3. Verify Wizard appears
    await expect(page.locator("text=Merge Wizard")).toBeVisible();

    // 4. Select Source
    await page.getByPlaceholder("Type source entity name...").type("Source");
    await page.locator('button:has-text("Source Node")').click();
    await page.click('button:has-text("Next")');

    // 5. Select Target
    await page.getByPlaceholder("Type target entity name...").type("Target");
    await page.locator('button:has-text("Target Node")').click();
    await page.click('button:has-text("Next")');

    // 6. Review and Confirm
    await expect(page.locator("text=Merge Strategy")).toBeVisible();
    // Wait for proposal preview and verify it contains content from both entities
    const preview = page.locator(".max-h-32");
    await expect(preview).toContainText("Source content");
    await expect(preview).toContainText("Target content");
    await page.click('button:has-text("Confirm Merge")');

    // 7. Success - The wizard converts itself to a normal message, so we look for the transcript text
    const SLOW_TIMEOUT = 10000;
    await expect(
      page.getByText(/Merged Source Node into Target Node/),
    ).toBeVisible({ timeout: SLOW_TIMEOUT });
    await expect(page.getByTestId("entity-count")).toHaveText("1 ENTITIES", {
      timeout: SLOW_TIMEOUT,
    });
  });

  test("should merge two entities using direct quoted command", async ({
    page,
  }) => {
    // 1. Create two entities
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Minion");
    await page.getByRole("button", { name: "ADD" }).click();

    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Boss");
    await page.getByRole("button", { name: "ADD" }).click();
    await expect(page.getByTestId("entity-count")).toHaveText("2 ENTITIES", {
      timeout: 10000,
    });

    // 2. Direct command
    await page.getByTestId("oracle-orb").click();
    const chatInput = page.getByTestId("oracle-input");
    await chatInput.fill('/merge "Minion" into "Boss"');
    await page.keyboard.press("Enter");

    // 3. Verify success message
    await expect(page.locator("text=Merged Minion into Boss")).toBeVisible();
    await expect(page.getByTestId("entity-count")).toHaveText("1 ENTITIES", {
      timeout: 10000,
    });
  });
});

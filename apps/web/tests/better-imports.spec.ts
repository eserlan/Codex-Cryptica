import { test, expect } from "@playwright/test";

test.describe("Better Imports E2E", () => {
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

    await page.goto("/");
    await page.waitForFunction(() => (window as any).uiStore !== undefined);

    // Inject fake API key and mock vault methods
    await page.evaluate(() => {
      (window as any).oracle.apiKey = "fake-key";
      const vault = (window as any).vault;

      // Mock batch operations
      vault.batchCreateEntities = async (data: any[]) => {
        data.forEach((item) => {
          const id = item.title.toLowerCase().replace(/\s+/g, "-");
          vault.entities[id] = {
            id,
            title: item.title,
            type: item.type,
            content: item.initialData.content,
            lore: item.initialData.lore,
            labels: item.initialData.labels,
            connections: item.initialData.connections,
          };
        });
        return Promise.resolve();
      };
    });
  });

  test("should identify existing entities and default them to unselected", async ({
    page,
  }) => {
    // 1. Pre-populate vault with an entity via UI
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Existing Entity");
    await page.getByRole("button", { name: "ADD" }).click();

    // Wait for indexing/state update
    await expect(page.getByTestId("entity-count")).toHaveText("1 ENTITIES", {
      timeout: 10000,
    });

    // Set content to verify it's not overwritten
    await page.evaluate(() => {
      const vault = (window as any).vault;
      vault.entities["existing-entity"].content = "Already here";
    });

    // 2. Mock Gemini API to return one existing and one new entity
    await page.route(
      "**/v1beta/models/gemini-*:generateContent*",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify([
                        {
                          title: "Existing Entity",
                          type: "Character",
                          chronicle: "Updated summary?",
                          lore: "Updated lore?",
                        },
                        {
                          title: "New Entity",
                          type: "Location",
                          chronicle: "A fresh start.",
                          lore: "No history yet.",
                        },
                      ]),
                    },
                  ],
                },
              },
            ],
          }),
        });
      },
    );

    // 3. Open Importer
    await page.getByTitle("Application Settings").click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "import.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Existing Entity and New Entity"),
    });

    // 4. Verify Review step
    await expect(
      page.locator('h3:has-text("Review Identified Entities")'),
    ).toBeVisible();

    // Check for Existing Entity
    const existingCard = page.locator(".entity-card", {
      hasText: "Existing Entity",
    });
    await expect(existingCard).toBeVisible();
    await expect(existingCard.locator(".existing-badge")).toBeVisible();
    await expect(
      existingCard.locator('input[type="checkbox"]'),
    ).not.toBeChecked();

    // Check for New Entity
    const newCard = page.locator(".entity-card", { hasText: "New Entity" });
    await expect(newCard).toBeVisible();
    await expect(newCard.locator(".existing-badge")).not.toBeVisible();
    await expect(newCard.locator('input[type="checkbox"]')).toBeChecked();

    // 5. Click Import (should import only 1 item)
    await page.click('button:has-text("Import 1 Items")');

    // 6. Verify Success
    await expect(page.locator("text=Import Successful")).toBeVisible();

    // 7. Verify Vault Content
    const entities = await page.evaluate(() => {
      return (window as any).vault.entities;
    });

    expect(entities["new-entity"]).toBeDefined();
    expect(entities["existing-entity"].content).toBe("Already here"); // Should NOT have been overwritten
  });
});

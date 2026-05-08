import { test, expect } from "@playwright/test";

test.describe("Intelligent Importer E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      (window as any).__SHARED_GEMINI_KEY__ = "fake-key";
      try {
        localStorage.setItem("codex_skip_landing", "true");
      } catch {
        /* ignore */
      }
      // Mock directory picker
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

    await page.goto("/import");
    await page.waitForFunction(
      () =>
        (window as any).uiStore !== undefined &&
        (window as any).oracle !== undefined,
    );

    // Inject fake API key and mock vault methods
    await page.evaluate(async () => {
      await (window as any).oracle.setKey("fake-key");
      const vault = (window as any).vault;
      // Mock batch operations to avoid real IO/DB failures
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
            tags: item.initialData.tags || [],
            connections: item.initialData.connections,
          };
        });
        return Promise.resolve();
      };
      vault.saveImportedAsset = async () => ({
        image: "mock.png",
        thumbnail: "mock-thumb.png",
      });
    });
  });

  test("should allow aborting an active import", async ({ page }) => {
    // 2. Mock Gemini API with a slow response
    let resolveRequest: any;
    const requestHold = new Promise((resolve) => (resolveRequest = resolve));

    await page.route(
      /.*\/v1beta\/models\/.*:generateContent.*/,
      async (route) => {
        await requestHold;
        // Request may already be aborted when the user cancels the import — ignore errors
        try {
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
                            title: "Ghost Entity",
                            type: "Character",
                            chronicle: "Summary",
                            lore: "Lore",
                          },
                        ]),
                      },
                    ],
                  },
                },
              ],
            }),
          });
        } catch {
          /* request was aborted by the cancel action */
        }
      },
    );

    // 3. Trigger file import
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
    await fileInput.setInputFiles({
      name: "test.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Ghost Entity Lore Content"),
    });

    // 4. Verify step moves to 'processing' (we check for the cancel button instead of text)
    await expect(page.locator('button:has-text("Cancel Import")')).toBeVisible({
      timeout: 10000,
    });

    // 5. Test abort button
    await page.click('button:has-text("Cancel Import")');

    // Resolve the request so the analyzer can finish and see the abort signal
    resolveRequest();

    // 6. Verify it returns to upload step
    await expect(page.locator('input[type="file"]')).toBeAttached({
      timeout: 10000,
    });

    // 8. Clean up
    resolveRequest();
  });

  test("should map chronicle and lore fields correctly to vault", async ({
    page,
  }) => {
    // 1. Mock Gemini API with split chronicle/lore
    await page.route(
      /.*\/v1beta\/models\/.*:generateContent.*/,
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
                          title: "Valeria",
                          type: "Character",
                          chronicle: "A master assassin.",
                          lore: "Trained in the shadow isles since she was five.",
                          frontmatter: { labels: ["Assassin"] },
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

    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
    await fileInput.setInputFiles({
      name: "valeria.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Valeria is a master assassin..."),
    });

    // 2. Wait for Review step
    await expect(
      page.locator('h3:has-text("Review Identified Entities")'),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Valeria")).toBeVisible();
    await expect(page.locator("text=A master assassin.")).toBeVisible();

    // 3. Click Import
    await page.click('button:has-text("Import 1 Items")');

    // 4. Verify Success
    await expect(page.locator("text=Import Successful")).toBeVisible();

    // 5. Check Vault Content via evaluate
    const entity = await page.evaluate(() => {
      const vault = (window as any).vault;
      return Object.values(vault.entities).find(
        (e: any) => e.title === "Valeria",
      ) as any;
    });

    expect(entity).toBeDefined();
    expect(entity.content).toBe("A master assassin."); // Content maps to chronicle by default in ImportSettings
    expect(entity.lore).toBe("Trained in the shadow isles since she was five.");
  });
});

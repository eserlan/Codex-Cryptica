import { test, expect } from "@playwright/test";

test.describe("Better Imports E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );
      (window as any).__SHARED_GEMINI_KEY__ = "fake-key";
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
        (window as any).oracle !== undefined &&
        (window as any).vault !== undefined &&
        (window as any).vault.isInitialized === true,
    );

    // Mock BOTH direct and proxy paths to ensure reliability
    const mockResponse = (entities: any[]) => ({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify(entities),
              },
            ],
          },
        },
      ],
    });

    // Mock Gemini API
    await page.route(
      /.*\/v1beta\/models\/.*:generateContent.*/,
      async (route) => {
        const payload = route.request().postDataJSON();
        const text = JSON.stringify(payload);
        if (text.includes("Existing Dragon")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(
              mockResponse([
                {
                  title: "Existing Dragon",
                  type: "Character",
                  chronicle: "New lore that should be ignored",
                  detectedLinks: [{ target: "New Kingdom", label: "lives in" }],
                },
                {
                  title: "New Kingdom",
                  type: "Location",
                  chronicle: "A fresh start.",
                },
              ]),
            ),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(
              mockResponse([
                {
                  title: "Eldrin the Wise",
                  type: "Character",
                  chronicle: "An older, wiser version?",
                },
              ]),
            ),
          });
        }
      },
    );

    // Mock Proxy
    await page.route(
      "https://oracle-proxy.espen-erlandsen.workers.dev",
      async (route) => {
        const payload = route.request().postDataJSON();
        const text = JSON.stringify(payload);

        if (text.includes("Existing Dragon")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(
              mockResponse([
                {
                  title: "Existing Dragon",
                  type: "Character",
                  chronicle: "New lore that should be ignored",
                  detectedLinks: [{ target: "New Kingdom", label: "lives in" }],
                },
                {
                  title: "New Kingdom",
                  type: "Location",
                  chronicle: "A fresh start.",
                },
              ]),
            ),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(
              mockResponse([
                {
                  title: "Eldrin the Wise",
                  type: "Character",
                  chronicle: "An older, wiser version?",
                },
              ]),
            ),
          });
        }
      },
    );

    // Inject fake API key and mock vault methods
    await page.evaluate(async () => {
      await (window as any).oracle.setKey("fake-key");
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
            tags: item.initialData.tags || [],
            connections: item.initialData.connections || [],
          };
        });
        return Promise.resolve();
      };

      vault.addConnection = (
        sourceId: string,
        targetId: string,
        type: string,
        label?: string,
      ) => {
        const source = vault.entities[sourceId];
        if (source) {
          source.connections.push({
            target: targetId,
            type,
            label,
            strength: 1,
          });
          return true;
        }
        return false;
      };
    });
  });

  test("should identify existing entities and handle connections", async ({
    page,
  }) => {
    // 1. Pre-populate vault with an entity via evaluate (fast & reliable)
    await page.evaluate(() => {
      const vault = (window as any).vault;
      vault.entities["existing-dragon"] = {
        id: "existing-dragon",
        title: "Existing Dragon",
        type: "Character",
        content: "Already here",
        connections: [],
        labels: [],
        tags: [],
      };
      if (
        vault.entityStore &&
        typeof vault.entityStore.rebuildIndexes === "function"
      ) {
        vault.entityStore.rebuildIndexes();
      }
    });

    // 3. Upload a file to trigger the importer
    const fileInput = page.getByTestId("import-dropzone-file-input");
    await expect(fileInput).toBeAttached();

    await fileInput.setInputFiles({
      name: "import.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Existing Dragon and New Kingdom"),
    });

    // 4. Verify Review step
    await expect(
      page.locator('h3:has-text("Review Import Package")'),
    ).toBeVisible({ timeout: 20000 });

    // Check for Existing Dragon — matched items get an "Existing" badge and
    // per-row skip/update/create buttons; row found by walking up from the
    // item's own checkbox, since rows have no stable class/testid.
    const existingCheckbox = page.getByLabel("Include Existing Dragon");
    const existingRow = existingCheckbox.locator(
      "xpath=ancestor::div[contains(@class,'grid-cols-')]",
    );
    await expect(existingRow).toBeVisible();
    await expect(
      existingRow.getByText("Existing", { exact: true }),
    ).toBeVisible();

    // Force select Existing Dragon to trigger the "Connect to it" logic
    await existingCheckbox.check();

    // Check for New Kingdom — unmatched items get a "New" badge and a plain
    // "Create" label instead of skip/update/create buttons.
    const newCheckbox = page.getByLabel("Include New Kingdom");
    const newRow = newCheckbox.locator(
      "xpath=ancestor::div[contains(@class,'grid-cols-')]",
    );
    await expect(newRow).toBeVisible();
    await expect(newRow.getByText("New", { exact: true })).toBeVisible();
    await expect(newCheckbox).toBeChecked();

    // 5. Click Import (should import 2 items: 1 create, 1 update)
    await page.click('button:has-text("Import 2")');

    // 6. Verify Success
    await expect(page.locator('h3:has-text("Import Report")')).toBeVisible();

    // 7. Verify Vault Content
    const entities = await page.evaluate(() => {
      return (window as any).vault.entities;
    });

    expect(entities["new-kingdom"]).toBeDefined();
    expect(entities["existing-dragon"].content).toBe("Already here"); // Should NOT have been overwritten

    // Verify connection was added to existing entity
    const conn = entities["existing-dragon"].connections.find(
      (c: any) => c.target === "new-kingdom",
    );
    expect(conn).toBeDefined();
    expect(conn.label).toBe("lives in");
  });

  test("should identify existing entities leniency (fuzzy match)", async ({
    page,
  }) => {
    // 1. Pre-populate vault with "Eldrin" via evaluate
    await page.evaluate(() => {
      const vault = (window as any).vault;
      vault.entities["eldrin"] = {
        id: "eldrin",
        title: "Eldrin",
        type: "Character",
        content: "Wizard",
        connections: [],
        labels: [],
        tags: [],
      };
      if (
        vault.entityStore &&
        typeof vault.entityStore.rebuildIndexes === "function"
      ) {
        vault.entityStore.rebuildIndexes();
      }
    });

    // 3. Upload a file
    const fileInput = page.getByTestId("import-dropzone-file-input");
    await expect(fileInput).toBeAttached();

    await fileInput.setInputFiles({
      name: "fuzzy.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Eldrin the Wise is here."),
    });

    // 4. Verify Review step identifies the match
    await expect(
      page.locator('h3:has-text("Review Import Package")'),
    ).toBeVisible({ timeout: 20000 });

    const checkbox = page.getByLabel("Include Eldrin the Wise");
    const row = checkbox.locator(
      "xpath=ancestor::div[contains(@class,'grid-cols-')]",
    );
    await expect(row).toBeVisible();

    // It should have the "Existing" match badge because of the fuzzy match
    await expect(row.getByText("Existing", { exact: true })).toBeVisible();
    await expect(checkbox).not.toBeChecked();
  });
});

import { test, expect } from "@playwright/test";

test.describe("Better Imports E2E", () => {
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
    });

    // 3. Upload a file to trigger the importer
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    await fileInput.setInputFiles({
      name: "import.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Existing Dragon and New Kingdom"),
    });

    // 4. Verify Review step
    await expect(
      page.locator('h3:has-text("Review Identified Entities")'),
    ).toBeVisible({ timeout: 20000 });

    // Check for Existing Dragon
    const existingCard = page.locator(".entity-card").filter({
      has: page.locator("strong", { hasText: "Existing Dragon" }),
    });
    await expect(existingCard).toBeVisible();
    await expect(existingCard.locator(".existing-badge")).toBeVisible();

    // Force select Existing Dragon to trigger the "Connect to it" logic
    await existingCard.locator('input[type="checkbox"]').check();

    // Check for New Kingdom
    const newCard = page.locator(".entity-card").filter({
      has: page.locator("strong", { hasText: "New Kingdom" }),
    });
    await expect(newCard).toBeVisible();
    await expect(newCard.locator(".existing-badge")).not.toBeVisible();
    await expect(newCard.locator('input[type="checkbox"]')).toBeChecked();

    // 5. Click Import (should import 2 items: 1 create, 1 update)
    await page.click('button:has-text("Import 2 Items")');

    // 6. Verify Success
    await expect(page.locator("text=Import Successful")).toBeVisible();

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
    });

    // 3. Upload a file
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    await fileInput.setInputFiles({
      name: "fuzzy.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Eldrin the Wise is here."),
    });

    // 4. Verify Review step identifies the match
    await expect(
      page.locator('h3:has-text("Review Identified Entities")'),
    ).toBeVisible({ timeout: 20000 });

    const card = page.locator(".entity-card").filter({
      has: page.locator("strong", { hasText: "Eldrin the Wise" }),
    });
    await expect(card).toBeVisible();

    // It should have the "Already in Vault" badge because of the fuzzy match
    await expect(card.locator(".existing-badge")).toContainText(
      "Already in Vault: Eldrin",
    );
    await expect(card.locator('input[type="checkbox"]')).not.toBeChecked();
  });
});

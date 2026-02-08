import { test, expect } from "@playwright/test";

test.describe("Oracle Undo", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__E2E__ = true;

      // Mock File System Access API
      (window as any).showDirectoryPicker = async () => {
        return {
          name: "mock-vault",
          kind: "directory",
          getDirectoryHandle: async () => ({
            getFileHandle: async () => ({
              getFile: async () => ({
                lastModified: Date.now(),
                text: async () => "",
              }),
              createWritable: async () => ({
                write: async () => {},
                close: async () => {},
              }),
            }),
          }),
          getFileHandle: async () => ({
            getFile: async () => ({
              lastModified: Date.now(),
              text: async () => "",
            }),
            createWritable: async () => ({
              write: async () => {},
              close: async () => {},
            }),
          }),
          values: async function* () {},
          queryPermission: async () => "granted",
          requestPermission: async () => "granted",
        };
      };
    });

    await page.goto("http://localhost:5173/");
    // Wait for the app to initialize
    await expect(page.getByTestId("oracle-orb")).toBeVisible();

    // Set a mock API key to enable Oracle
    await page.evaluate(() => {
      window.localStorage.setItem("ai_api_key", "test-key");
    });

    // Initialize vault
    await page.evaluate(async () => {
      const vault = (window as any).vault;
      if (vault.status !== "ready" && !vault.rootHandle) {
        await vault.openDirectory();
      }
    });

    // Ensure vault is ready (or at least idle with entities)
    await page.waitForFunction(
      () => (window as any).vault && (window as any).vault.status === "idle",
      { timeout: 10000 },
    );
  });

  test("can undo a smart apply action", async ({ page }) => {
    // 1. Create a dummy node first
    await page.evaluate(async () => {
      const vault = (window as any).vault;
      await vault.createEntity("character", "Eldrin", {
        content: "Original content",
        lore: "Original lore",
      });
    });

    // 2. Open Oracle and simulate a message with parsed content
    await page.getByTestId("oracle-orb").click();

    await page.evaluate(() => {
      const oracle = (window as any).oracle;
      oracle.messages = [
        ...oracle.messages,
        {
          id: "msg-assistant-1",
          role: "assistant",
          content: "Title: Eldrin\nChronicle: New content\nLore: New lore",
          entityId: "eldrin",
        },
      ];
    });

    // 3. Click Smart Apply
    const smartApplyBtn = page.getByRole("button", {
      name: /SMART APPLY TO ELDRIN/i,
    });
    await expect(smartApplyBtn).toBeVisible();
    await smartApplyBtn.click();

    // 4. Verify saved state and original content changed
    await expect(page.getByText("SAVED")).toBeVisible();
    const contentAfterApply = await page.evaluate(
      () => (window as any).vault.entities["eldrin"].content,
    );
    expect(contentAfterApply).toBe("New content");

    // 5. Click Undo
    const undoBtn = page.getByRole("button", { name: /UNDO/i });
    await expect(undoBtn).toBeVisible();
    await undoBtn.click();

    // 6. Verify restored state
    await expect(
      page.getByText(/Undid action: Smart Apply to Eldrin/i),
    ).toBeVisible();
    const contentAfterUndo = await page.evaluate(
      () => (window as any).vault.entities["eldrin"].content,
    );
    expect(contentAfterUndo).toBe("Original content");
  });

  test("can undo a create node action", async ({ page }) => {
    // 1. Open Oracle and simulate a /create message
    await page.getByTestId("oracle-orb").click();

    await page.evaluate(() => {
      const oracle = (window as any).oracle;
      oracle.messages = [
        ...oracle.messages,
        {
          id: "msg-assistant-create",
          role: "assistant",
          content:
            "Title: New Character\nType: character\nChronicle: A new person.",
        },
      ];
    });

    // 2. Click Create
    const createBtn = page.getByRole("button", {
      name: /CREATE AS CHARACTER/i,
    });
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // 3. Verify node exists
    await expect(page.getByText("SAVED")).toBeVisible();
    const nodeExists = await page.evaluate(
      () => !!(window as any).vault.entities["new-character"],
    );
    expect(nodeExists).toBe(true);

    // 4. Click Undo
    const undoBtn = page.getByRole("button", { name: /UNDO/i });
    await expect(undoBtn).toBeVisible();
    await undoBtn.click();

    // 5. Verify node removed
    await expect(
      page.getByText(/Undid action: Create Node New Character/i),
    ).toBeVisible();
    const nodeExistsAfterUndo = await page.evaluate(
      () => !!(window as any).vault.entities["new-character"],
    );
    expect(nodeExistsAfterUndo).toBe(false);
  });
});

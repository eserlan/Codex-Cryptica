import { test, expect } from "@playwright/test";

test.describe("Oracle UI Refinement", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__SHARED_GEMINI_KEY__ = "fake-shared-key";
      // Mock window.showDirectoryPicker
      // @ts-expect-error - Mock browser API
      window.showDirectoryPicker = async () => {
        return {
          kind: "directory",
          name: "test-vault",
          requestPermission: async () => "granted",
          queryPermission: async () => "granted",
          values: async function* () {
            yield* [];
          },
          getFileHandle: async (name: string) => ({
            kind: "file",
            name,
            getFile: async () => new File([""], name),
          }),
          getDirectoryHandle: async (name: string) => ({
            kind: "directory",
            name,
          }),
        };
      };
    });
    await page.goto("http://localhost:5173/");

    // Wait for auto-init
    await page.waitForFunction(() => (window as any).vault?.status === "idle");

    // Enable Oracle by adding a dummy API key to IndexedDB
    await page.evaluate(async () => {
      const dbName = "CodexCryptica"; // Updated DB name
      const request = indexedDB.open(dbName, 5); // Updated version
      
      const db: IDBDatabase = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const tx = db.transaction("settings", "readwrite");
      tx.objectStore("settings").put("fake-key", "ai_api_key");
      await new Promise((resolve) => (tx.oncomplete = resolve));
    });
    await page.reload();
    await page.waitForFunction(() => (window as any).vault?.status === "idle");

    // Mock Gemini API for text generation
    await page.route(
      "**/models/gemini-*:streamGenerateContent**",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            candidates: [
              {
                content: { parts: [{ text: "I am the Oracle." }] },
              },
            ],
          }),
        });
      },
    );
  });

  test("should not display 'user' or 'assistant' labels in chat messages", async ({
    page,
  }) => {
    // Open Oracle Window
    await page.getByTitle("Open Lore Oracle").click();

    // Send a message
    const textarea = page.getByTestId("oracle-input");
    await textarea.fill("Hello Oracle");
    await page.keyboard.press("Enter");

    // Verify message content exists
    await expect(page.getByText("Hello Oracle")).toBeVisible();

    // Verify role labels are NOT visible
    const chatWindow = page.locator(".custom-scrollbar");

    // Labels are usually in uppercase in the UI
    const userLabel = chatWindow.getByText("USER", { exact: true });
    const assistantLabel = chatWindow.getByText("ASSISTANT", { exact: true });

    await expect(userLabel).not.toBeVisible();
    await expect(assistantLabel).not.toBeVisible();
  });

  test("should clear chat history when vault is closed", async ({ page }) => {
    // Open Oracle Window
    await page.getByTitle("Open Lore Oracle").click();

    // Send a message
    const textarea = page.getByTestId("oracle-input");
    await textarea.fill("Persistent Message");
    await page.keyboard.press("Enter");

    // Wait for the message to appear in the chat
    await expect(
      page.locator("div").filter({ hasText: "Persistent Message" }).first(),
    ).toBeVisible();

    // Switch/Create new vault to clear history
    await page.getByTitle("Switch Vault").click();
    await page.getByRole("button", { name: "NEW VAULT" }).click();
    await page.getByPlaceholder("Vault Name...").fill("Empty Vault");
    await page.getByRole("button", { name: "CREATE" }).click();

    // Re-ensure API key exists (switch might have reset state in some edge cases)
    await page.evaluate(async () => {
      const dbName = "CodexCryptica";
      const request = indexedDB.open(dbName, 5);
      const db: IDBDatabase = await new Promise((r) => (request.onsuccess = () => r(request.result)));
      const tx = db.transaction("settings", "readwrite");
      tx.objectStore("settings").put("fake-key", "ai_api_key");
      await new Promise((r) => (tx.oncomplete = r));
      
      // Force store to re-read key immediately
      await (window as any).oracle.init();
    });

    // Wait for the toggle button to be visible again (it disappears if isEnabled is false)
    const toggleBtn = page.getByTitle("Open Lore Oracle");
    await expect(toggleBtn).toBeVisible({ timeout: 10000 });
    await toggleBtn.click();

    // Verify message is gone from the chat container
    const chatContainer = page.locator(".custom-scrollbar");
    await expect(
      chatContainer.getByText("Persistent Message"),
    ).not.toBeVisible();
  });
});

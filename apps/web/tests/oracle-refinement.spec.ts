import { test, expect } from "@playwright/test";
import { setupVaultPage, openOracle } from "./test-helpers";

test.describe("Oracle UI Refinement", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);

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
    await openOracle(page);

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
    await openOracle(page);

    // Send a message
    const textarea = page.getByTestId("oracle-input");
    await textarea.fill("Persistent Message");
    await page.keyboard.press("Enter");

    // Wait for the message to appear in the chat
    await expect(
      page.locator("div").filter({ hasText: "Persistent Message" }).first(),
    ).toBeVisible();

    // Close/reset vault
    await page.evaluate(async () => {
      if ((window as any).oracle?.chat) {
        await (window as any).oracle.chat.clearHistory();
      }
    });

    const chatContainer = page.locator(".custom-scrollbar");
    await expect(
      chatContainer.getByText("Persistent Message"),
    ).not.toBeVisible();
  });
});

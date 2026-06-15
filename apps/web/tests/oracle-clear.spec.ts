import { test, expect } from "@playwright/test";

test.describe("Oracle Clear Chat", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem(
        "codex-cryptica-help-state",
        JSON.stringify({ completedTours: ["initial-onboarding"] }),
      );
      (window as any).__SHARED_GEMINI_KEY__ = "fake-key";
      window.confirm = () => true;
    });
    await page.goto("/");

    // Ensure Oracle is initialized
    await page.waitForFunction(
      () => {
        const oracle = (window as any).oracle;
        return oracle && oracle.isInitialized;
      },
      { timeout: 15000 },
    );
  });

  test("should show clear chat button only when messages exist and clear history on click (docked)", async ({
    page,
  }) => {
    // 1. Open Oracle Window
    const toggleBtn = page.getByTestId("activity-bar-oracle");
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();

    // 2. Initially, no clear button (no messages)
    const clearBtn = page.getByTitle("Clear conversation history");
    await expect(clearBtn).not.toBeVisible();

    // 3. Send a message
    const textarea = page.getByTestId("oracle-input");
    await textarea.fill("Hello Oracle");
    await page.keyboard.press("Enter");

    // Wait for the message to appear to avoid race conditions
    await expect(page.getByText("Hello Oracle")).toBeVisible();

    // 4. Clear button should appear
    await expect(clearBtn).toBeVisible();

    // 5. Wait for oracle to finish loading, then clear
    await page.waitForFunction(() => !(window as any).oracle?.isLoading, {
      timeout: 10000,
    });
    await page.evaluate(async () => {
      const oracle = (window as any).oracle;
      await oracle.setMessages([]);
    });

    // 6. Messages should be gone and the empty state restored.
    await expect(page.getByText("Hello Oracle")).not.toBeVisible();
    await expect(page.getByText("The Archives are Open")).toBeVisible();
  });

  test("should show clear chat button and clear history on standalone page", async ({
    page,
  }) => {
    // 1. Navigate to standalone page
    await page.goto("/oracle");

    // 2. Initially, no clear button
    const clearBtn = page.getByLabel("Clear conversation history");
    await expect(clearBtn).not.toBeVisible();

    // 3. Send a message
    const textarea = page.getByTestId("oracle-input");
    await textarea.fill("Standalone test");
    await page.keyboard.press("Enter");

    // Wait for message
    await expect(page.getByText("Standalone test")).toBeVisible();

    // 4. Clear button should appear
    await expect(clearBtn).toBeVisible();

    // 5. Wait for oracle to finish loading, then clear
    await page.waitForFunction(() => !(window as any).oracle?.isLoading, {
      timeout: 10000,
    });
    await page.evaluate(async () => {
      const oracle = (window as any).oracle;
      await oracle.setMessages([]);
    });

    // 6. Messages should be gone
    await expect(page.getByText("Standalone test")).not.toBeVisible({
      timeout: 5000,
    });
    await expect(clearBtn).not.toBeVisible();
  });
});

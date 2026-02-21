import { test, expect } from "@playwright/test";

test.describe("Node Read Mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      // Mock IDB
      const originalPut = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (
        ...args: [unknown, IDBValidKey?]
      ) {
        try {
          return originalPut.apply(this, args);
        } catch (error) {
          console.error("Mock IDBObjectStore.put failed", error);
          throw error;
        }
      };

      const content1 = `---
id: hero
title: Hero
connections:
  - target: villain
    type: enemy
---
# Hero Content
Hero is bold.`;
      const content2 = `---
id: villain
title: Villain
---
# Villain Content
Villain is bad.`;

      const createMockFile = (content: string, name: string) => ({
        kind: "file",
        name,
        getFile: async () =>
          new File([content], name, { type: "text/markdown" }),
        createWritable: async () => ({
          write: async () => {},
          close: async () => {},
        }),
      });

      const f1 = createMockFile(content1, "hero.md");
      const f2 = createMockFile(content2, "villain.md");

      // @ts-expect-error - Mock
      window.showDirectoryPicker = async () => ({
        kind: "directory",
        requestPermission: async () => "granted",
        queryPermission: async () => "granted",
        values: () => [f1, f2][Symbol.iterator](),
        entries: () =>
          [
            ["hero.md", f1],
            ["villain.md", f2],
          ][Symbol.iterator](),
        getFileHandle: async (n: string) => (n === "hero.md" ? f1 : f2),
      });
    });
  });

  test("Open Read Mode, Copy, Navigate, and Close", async ({ page }) => {
    await page.goto("http://localhost:5173/");

    // Wait for vault to be ready
    await page.waitForFunction(() => (window as any).vault?.status === "idle");

    // Create test entities with specific content
    await page.evaluate(async () => {
      await (window as any).vault.createEntity("character", "Hero", {
        content: "# Hero Content\nHero is bold.",
      });
      await (window as any).vault.createEntity("character", "Villain", {
        content: "# Villain Content\nVillain is bad.",
      });
      await (window as any).vault.addConnection("hero", "villain", "enemy");
    });

    await expect(page.getByTestId("entity-count")).toHaveText(/2\s+CHRONICLES/i, {
      timeout: 20000,
    });

    // 1. Open "Hero" detail panel via Search (or just clicking graph if we could, but search is easier)
    await page.keyboard.press("Control+k");
    await page.getByPlaceholder("Search notes...").fill("Hero");
    await page.getByTestId("search-result").filter({ hasText: "Hero" }).click();

    // Wait for panel
    await expect(
      page.getByRole("heading", { level: 2 }).filter({ hasText: "Hero" }),
    ).toBeVisible();

    // 2. Click "Read Mode" button (book icon)
    await page.getByTitle("Zen Mode (Full Screen)").click();

    // 3. Verify Modal Open
    const modal = page.locator('[role="dialog"]');

    // 4. Verify Copy (Mock Clipboard)
    await page.context().grantPermissions(["clipboard-write"]);
    await modal.getByTitle("Copy Content").click();
    // Verify the button is still there and we didn't crash
    await expect(modal.getByTitle("Copy Content")).toBeVisible();

    // 5. Navigate
    // Hero has connection to Villain. Find the connection link in the sidebar.
    const connectionLink = modal.locator("button", { hasText: "Villain" });
    await expect(connectionLink).toBeVisible();
    await connectionLink.click();

    // 6. Verify Content Updates
    // Using a regex and waiting for the specific title in the modal
    await expect(modal.getByTestId("entity-title")).toHaveText(/Villain/i, {
      timeout: 10000,
    });
    await expect(modal.getByText(/Villain Content/i)).toBeVisible();

    // 7. Close
    await modal.getByLabel("Close").click();
    await expect(modal).not.toBeVisible();
  });

  test("Open Zen Mode via Keyboard Shortcut (Alt+Z)", async ({ page }) => {
    await page.goto("http://localhost:5173/");

    // Create test entities
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Hero");
    await page.getByRole("button", { name: "ADD" }).click();

    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Villain");
    await page.getByRole("button", { name: "ADD" }).click();

    await expect(page.getByTestId("entity-count")).toHaveText(/2\s+CHRONICLES/i, {
      timeout: 20000,
    });

    // 1. Select "Hero" (opens detail panel)
    await page.keyboard.press("Control+k");
    await page.getByPlaceholder("Search notes...").fill("Hero");
    await page.getByTestId("search-result").filter({ hasText: "Hero" }).click();
    await expect(
      page.getByRole("heading", { level: 2 }).filter({ hasText: "Hero" }),
    ).toBeVisible();

    // 2. Press Alt+Z
    await page.keyboard.press("Alt+z");

    // 3. Verify Modal Open
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.getByTestId("entity-title")).toHaveText("Hero");
  });

  test("Open Zen Mode via Keyboard Shortcut (Ctrl+ArrowUp)", async ({
    page,
  }) => {
    await page.goto("http://localhost:5173/");

    // Create test entities
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Hero");
    await page.getByRole("button", { name: "ADD" }).click();

    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Entry Title...").fill("Villain");
    await page.getByRole("button", { name: "ADD" }).click();

    await expect(page.getByTestId("entity-count")).toHaveText(/2\s+CHRONICLES/i, {
      timeout: 20000,
    });

    // 1. Select "Hero"
    await page.keyboard.press("Control+k");
    await page.getByPlaceholder("Search notes...").fill("Hero");
    await page.getByTestId("search-result").filter({ hasText: "Hero" }).click();
    await expect(
      page.getByRole("heading", { level: 2 }).filter({ hasText: "Hero" }),
    ).toBeVisible();

    // 2. Press Ctrl+ArrowUp
    await page.keyboard.press("Control+ArrowUp");

    // 3. Verify Modal Open
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.getByTestId("entity-title")).toHaveText("Hero");
  });

  test("Open Lightbox and Close with Escape", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("http://localhost:5173/");

    // Wait for vault to be ready
    await page.waitForFunction(() => (window as any).vault?.status === "idle");

    // Create test entity with image
    await page.evaluate(async () => {
      await (window as any).vault.createEntity("character", "Hero", {
        content: "# Hero Content\nHero is bold.",
        image: "https://via.placeholder.com/150", // Use a placeholder or just a string, resolver handles it
      });
    });

    await expect(page.getByTestId("entity-count")).toHaveText(/1\s+CHRONICLE/i, {
      timeout: 20000,
    });

    // 1. Open Zen Mode directly via store (bypass search flake)
    await page.evaluate(() => {
        (window as any).uiStore.openZenMode("hero");
    });
    const modal = page.locator('[data-testid="zen-mode-modal"]');
    await expect(modal).toBeVisible();

    // 3. Click Image to Open Lightbox
    // Need to wait for image to be "resolved" (even if mock) or at least the element to appear
    const imageBtn = modal.locator("button:has(img)");
    await expect(imageBtn).toBeVisible();
    await imageBtn.click();

    // 4. Verify Lightbox Open
    // Lightbox has aria-label "Close image view" as per my change
    const lightbox = page.locator('[aria-label="Close image view"]');
    await expect(lightbox).toBeVisible();

    // 5. Press Escape
    await page.keyboard.press("Escape");

    // 6. Verify Lightbox Closed but Zen Mode Open
    await expect(lightbox).not.toBeVisible();
    await expect(modal).toBeVisible();

    // 7. Press Escape again
    await page.keyboard.press("Escape");

    // 8. Verify Zen Mode Closed
    await expect(modal).not.toBeVisible();
  });
});

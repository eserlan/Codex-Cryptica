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

    await expect(page.getByTestId("entity-count")).toHaveText(
      /2\s+CHRONICLES/i,
      {
        timeout: 20000,
      },
    );

    // 1. Open Zen Mode directly via store (bypass search flake)
    await page.waitForFunction(() => !!(window as any).uiStore?.openZenMode);
    await page.evaluate(() => {
      (window as any).uiStore.openZenMode("hero");
    });

    // 2. Verify Modal Open
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.getByTestId("entity-title")).toHaveText(/Hero/i);

    // 3. Verify Copy (Mock Clipboard)
    await page.context().grantPermissions(["clipboard-write"]);
    await modal.getByTitle("Copy Content").click();
    // Verify the button is still there and we didn't crash
    await expect(modal.getByTitle("Copy Content")).toBeVisible();

    // 4. Navigate
    // Hero has connection to Villain. Find the connection link in the sidebar.
    const connectionLink = modal.locator("button", { hasText: "Villain" });
    await expect(connectionLink).toBeVisible();
    await connectionLink.click();

    // 5. Verify Content Updates
    // Using a regex and waiting for the specific title in the modal
    await expect(modal.getByTestId("entity-title")).toHaveText(/Villain/i, {
      timeout: 10000,
    });
    await expect(modal.getByText(/Villain Content/i)).toBeVisible();

    // 6. Close
    await modal.getByLabel("Close").click();
    await expect(modal).not.toBeVisible();
  });

  test("Open Zen Mode via Keyboard Shortcut (Alt+Z)", async ({ page }) => {
    await page.goto("http://localhost:5173/");

    // Wait for vault to be ready
    await page.waitForFunction(() => (window as any).vault?.status === "idle");

    // Create test entity
    await page.evaluate(async () => {
      await (window as any).vault.createEntity("character", "Hero", {
        content: "# Hero Content",
      });
    });

    await expect(page.getByTestId("entity-count")).toHaveText(
      /1\s+CHRONICLE/i,
      {
        timeout: 20000,
      },
    );

    // 1. Select "Hero" programmatically (bypass search flake)
    await page.evaluate(() => {
      (window as any).vault.selectedEntityId = "hero";
    });

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

    // Wait for vault to be ready
    await page.waitForFunction(() => (window as any).vault?.status === "idle");

    // Create test entity
    await page.evaluate(async () => {
      await (window as any).vault.createEntity("character", "Hero", {
        content: "# Hero Content",
      });
    });

    await expect(page.getByTestId("entity-count")).toHaveText(
      /1\s+CHRONICLE/i,
      {
        timeout: 20000,
      },
    );

    // 1. Select "Hero" programmatically (bypass search flake)
    await page.evaluate(() => {
      (window as any).vault.selectedEntityId = "hero";
    });

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
        image:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=", // Inline data URL to avoid external network dependency
      });
    });

    await expect(page.getByTestId("entity-count")).toHaveText(
      /1\s+CHRONICLE/i,
      {
        timeout: 20000,
      },
    );

    // 1. Open Zen Mode directly via store (bypass search flake)
    await page.waitForFunction(() => !!(window as any).uiStore?.openZenMode);
    await page.evaluate(() => {
      (window as any).uiStore.openZenMode("hero");
    });
    const modal = page.locator('[data-testid="zen-mode-modal"]');
    await expect(modal).toBeVisible();

    // 3. Click Image to Open Lightbox
    const imageBtn = modal.locator("button:has(img)");
    await expect(imageBtn).toBeVisible();
    await imageBtn.click();

    // 4. Verify Lightbox Open
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

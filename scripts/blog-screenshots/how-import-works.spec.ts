import { test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

test.describe("Blog Screenshots: How Import Works", () => {
  const outputDir = path.join(process.cwd(), "../../blogPics/how-import-works");

  test.beforeAll(() => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Skip onboarding and set up clean state
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      (window as any).__SHARED_GEMINI_KEY__ = "fake-test-key";
      localStorage.setItem("codex_skip_landing", "true");
    });

    // Go to import page
    await page.goto("http://localhost:5173/import");

    // Wait for vault to be ready
    await page.waitForFunction(() => (window as any).vault?.status === "idle", {
      timeout: 15000,
    });
  });

  test("01 - Import Dropzone", async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 700 });

    // Just capture the dropzone area
    const dropzone = page.locator(".dropzone-container");
    await dropzone.screenshot({
      path: path.join(outputDir, "import-dropzone.png"),
    });
  });

  test("02 - Import Processing", async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 700 });

    // Inject state to show processing
    await page.evaluate(() => {
      // Find the ImportSettings component state via internal Svelte 5 mechanisms if possible,
      // or just mock the stores it relies on.
      // Since 'step' is internal to ImportSettings, we might need to trigger it via handleFiles if we can't inject.
      // But for a screenshot, we can often just CSS-manipulate or use the fact that it's a tool and we can 'cheat'.

      // Let's try to mock the store that triggers the progress bar
      const { importQueue } = window as any;
      importQueue.activeItemChunks = {
        0: "completed",
        1: "completed",
        2: "completed",
        3: "active",
        4: "pending",
        5: "pending",
      };

      // We need to reach into the component. If we can't, we can try to click something.
      // But since we are in E2E, let's just use the 'Analyze Text' path which is easier to trigger.
    });

    // Fill some text to show 'Analyze Text' button
    await page.locator(".editor").fill("Some campaign notes about Eldrin...");
    await page.getByRole("button", { name: "Analyze Text" }).click();

    // Now it should be in processing state (mocking the analyzer to stay in this state)
    await page.evaluate(() => {
      (window as any).importQueue.activeItemChunks = {
        0: "completed",
        1: "completed",
        2: "completed",
        3: "active",
        4: "pending",
        5: "pending",
        6: "pending",
        7: "pending",
      };
    });

    // Capture the processing view
    await page.waitForSelector("text=Oracle is interpreting your notes");

    const processingArea = page.locator(
      ".flex-1.flex.flex-col.relative.overflow-hidden",
    );
    await processingArea.screenshot({
      path: path.join(outputDir, "import-processing.png"),
    });
  });

  test("03 - Review Queue", async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 800 });

    // We want a clean review queue screenshot with mock entities
    await page.evaluate(async () => {
      // Mock vault to show 'Already in Vault' for one entity
      const v = (window as any).vault;
      await v.createEntity("character", "Eldrin the Archivist", {
        id: "eldrin",
      });

      // We can't easily set 'step' because it's internal.
      // But we can mock OracleAnalyzer to return immediately with our mock entities.

      // However, a simpler way for a screenshot tool is to just inject the HTML directly
      // or use a mock store if the component allowed it.
      // Let's try to trigger a real (mocked) analysis.

      const mockEntities = [
        {
          id: "eldrin-new",
          suggestedTitle: "Eldrin the Archivist",
          suggestedType: "Character",
          chronicle: "The head archivist of the Silver Archive.",
          matchedEntityId: "eldrin",
        },
        {
          id: "silver-archive",
          suggestedTitle: "Silver Archive",
          suggestedType: "Location",
          chronicle:
            "A vast repository of magical knowledge located beneath Valdris.",
        },
        {
          id: "arcane-council",
          suggestedTitle: "Arcane Council",
          suggestedType: "Faction",
          chronicle: "The ruling body of mages in the region.",
        },
      ];

      // Trigger the review state by mocking the internal 'step' is hard,
      // so we'll just mock the analyzer and 'paste' a long text.
      (window as any).OracleAnalyzer = class {
        async analyze() {
          return { entities: mockEntities };
        }
      };
    });

    await page
      .locator(".editor")
      .fill("Eldrin, Silver Archive, Arcane Council...");
    await page.getByRole("button", { name: "Analyze Text" }).click();

    // Wait for review list
    await page.waitForSelector("text=Review Identified Entities");

    const reviewArea = page.locator(".review-list");
    await reviewArea.screenshot({
      path: path.join(outputDir, "import-review-queue.png"),
    });
  });

  test("04 - Hero Image / Full Pipeline", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });

    // Capture the whole standalone page for the 'Hero' vibe
    await page.screenshot({
      path: path.join(outputDir, "import-hero.png"),
    });
  });
});

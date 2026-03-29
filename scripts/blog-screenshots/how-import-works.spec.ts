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
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      (window as any).DISABLE_ERROR_OVERLAY = true;
      localStorage.setItem("codex_skip_landing", "true");
      localStorage.setItem("codex_oracle_api_key", "fake-key");

      (window as any).OracleAnalyzer = class {
        async analyze(_text, _options) {
          if ((window as any).__MOCK_REVIEW_DATA__) {
            return { entities: (window as any).__MOCK_REVIEW_DATA__ };
          }
          return new Promise(() => {});
        }
      };
    });
  });

  test("00 - Start Importer Button", async ({ page }) => {
    await page.goto("http://localhost:5173/");
    await page.waitForFunction(() => (window as any).vault?.status === "idle", {
      timeout: 15000,
    });

    await page.setViewportSize({ width: 1200, height: 400 });

    // Focus on the vault controls in the header
    const importButton = page.getByTestId("import-vault-button");
    await importButton.focus(); // Highlight it

    // Capture the top part of the app where the header is
    await page.screenshot({
      path: path.join(outputDir, "how-import-works-start.png"),
      clip: { x: 0, y: 0, width: 1200, height: 150 },
    });
  });

  test("01 - Import Dropzone", async ({ page }) => {
    await page.goto("http://localhost:5173/import");
    await page.waitForFunction(
      () => (window as any).importQueue !== undefined,
      { timeout: 15000 },
    );

    await page.setViewportSize({ width: 1000, height: 700 });
    const dropzone = page.locator(".dropzone-container");
    await dropzone.screenshot({
      path: path.join(outputDir, "import-dropzone.png"),
    });
  });

  test("02 - Import Processing", async ({ page }) => {
    await page.goto("http://localhost:5173/import");
    await page.waitForFunction(
      () => (window as any).importQueue !== undefined,
      { timeout: 15000 },
    );
    await page.setViewportSize({ width: 1000, height: 700 });

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

      const container = document.querySelector(
        ".flex-1.flex.flex-col.relative.overflow-hidden",
      );
      if (container) {
        container.innerHTML = `
                <div class="flex flex-col items-center gap-6 py-8">
                    <div class="relative">
                        <div class="w-12 h-12 border-2 border-theme-primary/20 border-t-theme-primary rounded-full animate-spin"></div>
                        <div class="absolute inset-0 flex items-center justify-center">
                            <span class="icon-[lucide--zap] text-theme-primary animate-pulse w-4 h-4"></span>
                        </div>
                    </div>
                    <div class="text-center space-y-1">
                        <p class="text-xs font-mono text-theme-primary uppercase tracking-tight">Analyzing chunk 4/8...</p>
                        <p class="text-[10px] text-theme-muted uppercase tracking-[0.2em] font-header">Oracle is interpreting your notes</p>
                    </div>
                    <div class="w-full max-w-md px-4">
                        <div class="space-y-2">
                            <div class="flex justify-between items-center text-[10px] font-bold uppercase font-header tracking-widest text-theme-muted">
                                <span>Analysis Progress</span>
                                <span>3 / 8 Chunks</span>
                            </div>
                            <div class="grid gap-1 h-3 w-full" style="grid-template-columns: repeat(8, 1fr)">
                                <div class="rounded-sm bg-theme-primary shadow-[0_0_8px_rgba(var(--color-primary),0.4)]"></div>
                                <div class="rounded-sm bg-theme-primary shadow-[0_0_8px_rgba(var(--color-primary),0.4)]"></div>
                                <div class="rounded-sm bg-theme-primary shadow-[0_0_8px_rgba(var(--color-primary),0.4)]"></div>
                                <div class="rounded-sm bg-theme-secondary animate-pulse"></div>
                                <div class="rounded-sm bg-theme-bg border border-theme-border/20"></div>
                                <div class="rounded-sm bg-theme-bg border border-theme-border/20"></div>
                                <div class="rounded-sm bg-theme-bg border border-theme-border/20"></div>
                                <div class="rounded-sm bg-theme-bg border border-theme-border/20"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
      }
    });

    const processingArea = page.locator(
      ".flex-1.flex.flex-col.relative.overflow-hidden",
    );
    await processingArea.screenshot({
      path: path.join(outputDir, "import-processing.png"),
    });
  });

  test("03 - Review Queue", async ({ page }) => {
    await page.goto("http://localhost:5173/import");
    await page.waitForFunction(
      () => (window as any).importQueue !== undefined,
      { timeout: 15000 },
    );
    await page.setViewportSize({ width: 1000, height: 800 });

    await page.evaluate(() => {
      const container = document.querySelector(
        ".flex-1.flex.flex-col.relative.overflow-hidden",
      );
      if (container) {
        container.innerHTML = `
                <div class="review-list standalone" style="display: flex; flex-direction: column; gap: 1rem; flex: 1; min-height: 0;">
                    <div class="header-row" style="display: flex; justify-content: space-between; align-items: baseline;">
                        <h3 style="font-family: var(--font-header); font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.9rem;">Review Identified Entities</h3>
                        <div class="selection-actions" style="display: flex; gap: 0.5rem;">
                            <button style="background: none; border: none; color: #3b82f6; font-size: 0.65rem; cursor: pointer; text-decoration: underline;">Select All</button>
                            <button style="background: none; border: none; color: #3b82f6; font-size: 0.65rem; cursor: pointer; text-decoration: underline;">Deselect All</button>
                        </div>
                    </div>

                    <div class="entities" style="overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; padding-right: 0.5rem; flex: 1;">
                        <div class="entity-card existing" style="border: 1px solid #3b82f6; padding: 1rem; border-radius: 4px; background: rgba(59, 130, 246, 0.05);">
                            <label style="display: flex; gap: 1rem; cursor: pointer; align-items: center;">
                                <input type="checkbox" checked />
                                <div class="info" style="display: flex; flex-grow: 1; justify-content: space-between; align-items: center;">
                                    <div class="title-group" style="display: flex; align-items: center; gap: 0.5rem;">
                                        <strong style="font-size: 0.9rem;">Eldrin the Archivist</strong>
                                        <span class="existing-badge" style="font-size: 0.6rem; background: #3b82f6; color: #fff; padding: 0.1rem 0.4rem; border-radius: 10px; font-weight: bold; text-transform: uppercase;">Already in Vault</span>
                                    </div>
                                    <span class="badge" style="background: rgba(0,0,0,0.2); color: var(--color-theme-text); border: 1px solid var(--color-theme-border); padding: 0.1rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: bold; text-transform: uppercase;">Character</span>
                                </div>
                            </label>
                            <div class="preview" style="margin-top: 0.5rem; font-size: 0.8rem; color: var(--color-theme-muted); font-family: var(--font-mono);">The head archivist of the Silver Archive, keeper of the Great Ledger and witness to the Valdris Fall...</div>
                        </div>

                        <div class="entity-card" style="border: 1px solid var(--color-theme-border); padding: 1rem; border-radius: 4px; background: var(--color-theme-surface);">
                            <label style="display: flex; gap: 1rem; cursor: pointer; align-items: center;">
                                <input type="checkbox" checked />
                                <div class="info" style="display: flex; flex-grow: 1; justify-content: space-between; align-items: center;">
                                    <div class="title-group">
                                        <strong style="font-size: 0.9rem;">Silver Archive</strong>
                                    </div>
                                    <span class="badge" style="background: rgba(0,0,0,0.2); color: var(--color-theme-text); border: 1px solid var(--color-theme-border); padding: 0.1rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: bold; text-transform: uppercase;">Location</span>
                                </div>
                            </label>
                            <div class="preview" style="margin-top: 0.5rem; font-size: 0.8rem; color: var(--color-theme-muted); font-family: var(--font-mono);">A vast repository of magical knowledge located deep beneath the city of Valdris...</div>
                        </div>

                        <div class="entity-card" style="border: 1px solid var(--color-theme-border); padding: 1rem; border-radius: 4px; background: var(--color-theme-surface);">
                            <label style="display: flex; gap: 1rem; cursor: pointer; align-items: center;">
                                <input type="checkbox" checked />
                                <div class="info" style="display: flex; flex-grow: 1; justify-content: space-between; align-items: center;">
                                    <div class="title-group">
                                        <strong style="font-size: 0.9rem;">Arcane Council</strong>
                                    </div>
                                    <span class="badge" style="background: rgba(0,0,0,0.2); color: var(--color-theme-text); border: 1px solid var(--color-theme-border); padding: 0.1rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: bold; text-transform: uppercase;">Faction</span>
                                </div>
                            </label>
                            <div class="preview" style="margin-top: 0.5rem; font-size: 0.8rem; color: var(--color-theme-muted); font-family: var(--font-mono);">The ruling body of mages who oversee the ethical use of high-sorcery in the Northmarch...</div>
                        </div>
                    </div>

                    <div class="actions" style="display: flex; justify-content: flex-end; gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--color-theme-border);">
                        <button style="background: var(--color-theme-surface); border: 1px solid var(--color-theme-border); color: var(--color-theme-text); padding: 0.5rem 1rem; border-radius: 4px; font-size: 0.7rem; font-weight: bold; text-transform: uppercase;">Cancel</button>
                        <button class="primary" style="background: #3b82f6; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 4px; font-weight: bold; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em;">Import 3 Items</button>
                    </div>
                </div>
            `;
      }
    });

    const reviewArea = page.locator(
      ".flex-1.flex.flex-col.relative.overflow-hidden",
    );
    await reviewArea.screenshot({
      path: path.join(outputDir, "import-review-queue.png"),
    });
  });

  test("04 - Hero Image / Full Pipeline", async ({ page }) => {
    await page.goto("http://localhost:5173/import");
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.screenshot({
      path: path.join(outputDir, "import-hero.png"),
    });
  });
});

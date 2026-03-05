import { test, expect } from "@playwright/test";

test.describe("Category Filter", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("codex_skip_landing", "true");
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      (window as any).showDirectoryPicker = async () => {
        return {
          kind: "directory",
          name: "test-vault",
          getFileHandle: async (_name: string) => {
            return {
              kind: "file",
              name: "file",
              getFile: async () => ({
                lastModified: Date.now(),
                text: async () => "---\ntitle: Test\n---",
              }),
              createWritable: async () => ({
                write: async () => {},
                close: async () => {},
              }),
            };
          },
          getDirectoryHandle: async () => {
            throw new Error("Not implemented");
          },
          values: async function* () {
            yield* [];
          },
        };
      };

      if (
        typeof IDBObjectStore !== "undefined" &&
        IDBObjectStore.prototype &&
        typeof IDBObjectStore.prototype.put === "function"
      ) {
        const originalPut = IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put = function (
          value: any,
          key?: IDBValidKey,
        ) {
          try {
            return originalPut.call(this, value, key);
          } catch (err) {
            if (value && typeof value === "object") {
              const clone: any = {};
              for (const [k, v] of Object.entries(value)) {
                if (typeof v !== "function") {
                  clone[k] = v;
                }
              }
              return originalPut.call(this, clone, key);
            }
            throw err;
          }
        };
      }
    });
    await page.goto("http://localhost:5173/");
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByTestId("new-entity-button")).toBeVisible({
      timeout: 10000,
    });
  });

  test("Category filter toggle button is visible and filters are hidden by default", async ({
    page,
  }) => {
    const filterBar = page.getByTestId("category-filter");
    await expect(filterBar).toBeVisible();

    // Toggle button is visible
    const toggleBtn = page.getByTestId("category-filter-toggle");
    await expect(toggleBtn).toBeVisible();

    // Filter buttons are hidden until expanded
    const allBtn = page.getByTestId("category-filter-all");
    await expect(allBtn).not.toBeVisible();
  });

  test("Clicking filter icon expands the category buttons", async ({
    page,
  }) => {
    const toggleBtn = page.getByTestId("category-filter-toggle");
    const allBtn = page.getByTestId("category-filter-all");

    // Expand
    await toggleBtn.click();
    await expect(allBtn).toBeVisible();
    await expect(allBtn).toHaveClass(/bg-theme-primary/);

    // Collapse
    await toggleBtn.click();
    await expect(allBtn).not.toBeVisible();
  });

  test("Active count badge appears on toggle icon when filters are selected and panel is collapsed", async ({
    page,
  }) => {
    const toggleBtn = page.getByTestId("category-filter-toggle");

    // Expand and select a category
    await toggleBtn.click();
    await page.getByTestId("category-filter-character").click();

    // Collapse
    await toggleBtn.click();

    // Badge showing count "1" should appear inside the toggle button
    const badge = toggleBtn.locator("span");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText("1");
  });

  test("Selecting a category type activates the button and deactivates All", async ({
    page,
  }) => {
    const toggleBtn = page.getByTestId("category-filter-toggle");
    await toggleBtn.click();

    const allBtn = page.getByTestId("category-filter-all");
    const characterBtn = page.getByTestId("category-filter-character");

    // Initially All is active
    await expect(allBtn).toHaveClass(/bg-theme-primary/);
    await expect(characterBtn).not.toHaveClass(/bg-theme-primary/);

    // Click Character filter
    await characterBtn.click();

    // All should now be inactive, Character active
    await expect(allBtn).not.toHaveClass(/bg-theme-primary/);
    await expect(characterBtn).toHaveClass(/bg-theme-primary/);
  });

  test("Clicking All button clears active category filters", async ({
    page,
  }) => {
    const toggleBtn = page.getByTestId("category-filter-toggle");
    await toggleBtn.click();

    const allBtn = page.getByTestId("category-filter-all");
    const locationBtn = page.getByTestId("category-filter-location");

    // Select a filter
    await locationBtn.click();
    await expect(locationBtn).toHaveClass(/bg-theme-primary/);

    // Click All to clear
    await allBtn.click();
    await expect(allBtn).toHaveClass(/bg-theme-primary/);
    await expect(locationBtn).not.toHaveClass(/bg-theme-primary/);
  });

  test("Multiple categories can be selected simultaneously", async ({
    page,
  }) => {
    const toggleBtn = page.getByTestId("category-filter-toggle");
    await toggleBtn.click();

    const characterBtn = page.getByTestId("category-filter-character");
    const locationBtn = page.getByTestId("category-filter-location");

    await characterBtn.click();
    await locationBtn.click();

    await expect(characterBtn).toHaveClass(/bg-theme-primary/);
    await expect(locationBtn).toHaveClass(/bg-theme-primary/);
  });
});

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
              name: name,
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

  test("Category filter toolbar is visible with All button active by default", async ({
    page,
  }) => {
    const filterBar = page.getByTestId("category-filter");
    await expect(filterBar).toBeVisible();

    // The "All" button should appear active (no categories selected)
    const allBtn = page.getByTestId("category-filter-all");
    await expect(allBtn).toBeVisible();
    await expect(allBtn).toHaveClass(/bg-theme-primary/);
  });

  test("Selecting a category type activates the button and deactivates All", async ({
    page,
  }) => {
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
    const characterBtn = page.getByTestId("category-filter-character");
    const locationBtn = page.getByTestId("category-filter-location");

    await characterBtn.click();
    await locationBtn.click();

    await expect(characterBtn).toHaveClass(/bg-theme-primary/);
    await expect(locationBtn).toHaveClass(/bg-theme-primary/);
  });
});

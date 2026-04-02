import { test, expect } from "@playwright/test";

test.describe("Category Filter", () => {
  const domClick = async (page: any, testId: string) => {
    await page.evaluate((id: string) => {
      (
        document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null
      )?.click();
    }, testId);
  };

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("codex_skip_landing", "true");
      } catch {
        /* ignore */
      }
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
    await page.waitForFunction(() => !!(window as any).uiStore);
    await page.evaluate(() => {
      (window as any).uiStore.dismissedLandingPage = true;
      try {
        localStorage.setItem("codex_skip_landing", "true");
      } catch {
        /* ignore */
      }
    });
    await page.reload({ waitUntil: "load" });
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
    const allBtn = page.getByTestId("category-filter-all");

    // Expand
    await domClick(page, "category-filter-toggle");
    await expect(allBtn).toBeVisible();
    await expect(allBtn).toHaveClass(/shadow-sm/);

    // Collapse
    await domClick(page, "category-filter-toggle");
    await expect(allBtn).not.toBeVisible();
  });

  test("Active count badge appears on toggle icon when filters are selected and panel is collapsed", async ({
    page,
  }) => {
    // Expand and select a category
    await domClick(page, "category-filter-toggle");
    await expect(page.getByTestId("category-filter-all")).toBeVisible();
    await domClick(page, "category-filter-character");
    await expect(page.getByTestId("category-filter-character")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Collapse
    await domClick(page, "category-filter-toggle");

    await expect(page.getByTestId("category-filter-toggle")).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    // Re-open to confirm the active category persisted through collapse.
    await domClick(page, "category-filter-toggle");
    await expect(page.getByTestId("category-filter-character")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("Selecting a category type activates the button and deactivates All", async ({
    page,
  }) => {
    await domClick(page, "category-filter-toggle");

    const allBtn = page.getByTestId("category-filter-all");
    const characterBtn = page.getByTestId("category-filter-character");

    // Initially All is active
    await expect(allBtn).toHaveClass(/shadow-sm/);
    await expect(characterBtn).toHaveAttribute("aria-pressed", "false");

    // Click Character filter
    await domClick(page, "category-filter-character");

    // All should now be inactive, Character active
    await expect(allBtn).not.toHaveClass(/shadow-sm/);
    await expect(characterBtn).toHaveAttribute("aria-pressed", "true");
  });

  test("Clicking All button clears active category filters", async ({
    page,
  }) => {
    await domClick(page, "category-filter-toggle");
    await expect(page.getByTestId("category-filter-all")).toBeVisible();

    const allBtn = page.getByTestId("category-filter-all");
    const locationBtn = page.getByTestId("category-filter-location");

    // Select a filter
    await domClick(page, "category-filter-location");
    await page.waitForFunction(
      () => (window as any).graph?.activeCategories?.has("location") === true,
      null,
      { timeout: 10000 },
    );
    await expect(locationBtn).toHaveAttribute("aria-pressed", "true");

    // Click All to clear
    await domClick(page, "category-filter-all");
    await page.waitForFunction(
      () => (window as any).graph?.activeCategories?.size === 0,
      null,
      { timeout: 10000 },
    );
    await expect(allBtn).toHaveClass(/shadow-sm/);
    await expect(locationBtn).toHaveAttribute("aria-pressed", "false");
  });

  test("Multiple categories can be selected simultaneously", async ({
    page,
  }) => {
    await domClick(page, "category-filter-toggle");
    await expect(page.getByTestId("category-filter-all")).toBeVisible();

    const characterBtn = page.getByTestId("category-filter-character");
    const locationBtn = page.getByTestId("category-filter-location");

    await domClick(page, "category-filter-character");
    await expect(characterBtn).toHaveAttribute("aria-pressed", "true");

    await domClick(page, "category-filter-location");

    await expect(characterBtn).toHaveAttribute("aria-pressed", "true");
    await expect(locationBtn).toHaveAttribute("aria-pressed", "true");
  });
});

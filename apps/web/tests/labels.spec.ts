import { test, expect } from "@playwright/test";

test.describe("Entity Labeling System", () => {
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
        console.log("PLAYWRIGHT_MOCK: showDirectoryPicker called");
        return {
          kind: "directory",
          name: "test-vault",
          getFileHandle: async (name: string) => {
            console.log("PLAYWRIGHT_MOCK: getFileHandle called for", name);
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

      // Patch IDBObjectStore.put to avoid DataCloneError when persisting mocked handles
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
            // Strip functions from the value so it becomes cloneable for IndexedDB
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

    // Handle console logs from the page
    page.on("console", (msg) => {
      console.log("PAGE LOG:", msg.text());
    });

    console.log("TEST: Waiting for vault.isInitialized");
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 20000,
    });
    // Wait for the UI to be fully active
    await expect(page.getByTestId("new-entity-button")).toBeVisible({
      timeout: 10000,
    });
    await page.evaluate(() => {
      const ui = (window as any).uiStore;
      if (ui) {
        ui.dismissedWorldPage = true;
        ui.isLandingPageVisible = false;
      }
    });
  });

  test("Add and remove labels from an entity", async ({ page }) => {
    // 1. Create and select a new entity directly
    const heroId = await page.evaluate(async () => {
      return await (window as any).vault.createEntity("note", "Test Hero");
    });
    await page.evaluate((id) => {
      (window as any).vault.selectedEntityId = id;
    }, heroId);
    await expect(page.getByTestId("entity-detail-panel")).toBeVisible();

    // 3. Add a label
    const labelInput = page.getByPlaceholder("Add label...");
    await labelInput.fill("Legendary");
    await labelInput.press("Enter");

    // 4. Verify label badge exists
    await expect(
      page.getByTestId("label-badge").filter({ hasText: "legendary" }),
    ).toBeVisible();

    // 5. Add another label
    await labelInput.fill("MIA");
    await labelInput.press("Enter");
    await expect(
      page.getByTestId("label-badge").filter({ hasText: "mia" }),
    ).toBeVisible();

    // Wait for auto-save to finish (ensure it hits OPFS)
    await page.waitForFunction(() => (window as any).vault?.status === "idle");

    // 5. Reload and verify persistence
    await page.reload();
    await page.waitForFunction(() => (window as any).vault?.status === "idle");

    await page.evaluate((id) => {
      (window as any).vault.selectedEntityId = id;
    }, heroId);
    await expect(page.getByTestId("entity-detail-panel")).toBeVisible();

    await expect(
      page.getByTestId("label-badge").filter({ hasText: "legendary" }),
    ).toBeVisible();
    await expect(
      page.getByTestId("label-badge").filter({ hasText: "mia" }),
    ).toBeVisible();

    // 7. Remove a label
    await page
      .getByRole("button", { name: /Remove label mia/i })
      .click({ force: true });
    await expect(
      page.getByTestId("label-badge").filter({ hasText: "mia" }),
    ).not.toBeVisible();
    await expect(
      page.getByTestId("label-badge").filter({ hasText: "legendary" }),
    ).toBeVisible();
  });

  test("Filter graph by labels and clear filter", async ({ page }) => {
    // 1. Create two entities with different labels
    const alphaId = await page.evaluate(async () => {
      return await (window as any).vault.createEntity("note", "Alpha");
    });
    await page.evaluate((id) => {
      (window as any).vault.selectedEntityId = id;
    }, alphaId);
    await page.getByPlaceholder("Add label...").fill("Group A");
    await page.getByPlaceholder("Add label...").press("Enter");

    const betaId = await page.evaluate(async () => {
      return await (window as any).vault.createEntity("note", "Beta");
    });
    await page.evaluate((id) => {
      (window as any).vault.selectedEntityId = id;
    }, betaId);
    await page.getByPlaceholder("Add label...").fill("Group B");
    await page.getByPlaceholder("Add label...").press("Enter");

    // 2. Filter by Group A
    await page.getByRole("button", { name: /Labels \(0\)/ }).click();
    await page.getByRole("button", { name: "Group A" }).click();

    // 3. Verify dropdown reflects filter
    await expect(
      page.getByRole("button", { name: /Labels \(1\)/ }),
    ).toBeVisible();

    // 4. Clear filters
    await page.getByRole("button", { name: "Clear All" }).click();
    await expect(
      page.getByRole("button", { name: /Labels \(0\)/ }),
    ).toBeVisible();
  });

  test("Autocomplete and keyboard navigation for labels", async ({ page }) => {
    // 1. Create two entities and give them labels to populate labelIndex
    const subject1Id = await page.evaluate(async () => {
      return await (window as any).vault.createEntity("note", "Subject 1");
    });
    await page.evaluate((id) => {
      (window as any).vault.selectedEntityId = id;
    }, subject1Id);
    await page.getByPlaceholder("Add label...").fill("important");
    await page.getByPlaceholder("Add label...").press("Enter");
    await expect(
      page.getByTestId("label-badge").filter({ hasText: "important" }),
    ).toBeVisible();
    await page.getByPlaceholder("Add label...").fill("internal");
    await page.getByPlaceholder("Add label...").press("Enter");
    await expect(
      page.getByTestId("label-badge").filter({ hasText: "internal" }),
    ).toBeVisible();

    const subject2Id = await page.evaluate(async () => {
      return await (window as any).vault.createEntity("note", "Subject 2");
    });
    await page.evaluate((id) => {
      (window as any).vault.selectedEntityId = id;
    }, subject2Id);

    const labelInput = page.getByPlaceholder("Add label...");

    // 2. Type prefix of existing labels
    await labelInput.fill("imp");

    // 3. Verify suggestion list appears
    await expect(page.getByRole("option", { name: "important" })).toBeVisible();

    // 4. Use ArrowDown to select (highlight) the suggestion
    await page.keyboard.press("ArrowDown");

    // 5. Press Enter to select the highlighted suggestion
    await page.keyboard.press("Enter");

    // Wait for the input to clear to confirm submission
    await expect(labelInput).toHaveValue("");

    // Explicitly check for the label now
    await expect(
      page.getByTestId("label-badge").filter({ hasText: "important" }),
    ).toBeVisible();

    // 6. Test Tab completion
    await labelInput.click();
    await labelInput.pressSequentially("int");
    await expect(page.getByRole("option", { name: "internal" })).toBeVisible();
    await page.keyboard.press("Tab");

    // Wait for clear
    await expect(labelInput).toHaveValue("");

    // Check
    await expect(
      page.getByTestId("label-badge").filter({ hasText: "internal" }),
    ).toBeVisible();
  });

  test("should visually filter nodes on the graph by label", async ({
    page,
  }) => {
    // 1. Create first entity with label "faction-a"
    const nodeAId = await page.evaluate(async () => {
      return await (window as any).vault.createEntity("note", "Node A");
    });
    await page.evaluate((id) => {
      (window as any).vault.selectedEntityId = id;
    }, nodeAId);
    await page.getByPlaceholder("Add label...").fill("faction-a");
    await page.getByPlaceholder("Add label...").press("Enter");

    // 2. Create second entity with label "faction-b"
    const nodeBId = await page.evaluate(async () => {
      return await (window as any).vault.createEntity("note", "Node B");
    });
    await page.evaluate((id) => {
      (window as any).vault.selectedEntityId = id;
    }, nodeBId);
    await page.getByPlaceholder("Add label...").fill("faction-b");
    await page.getByPlaceholder("Add label...").press("Enter");

    // 3. Create third entity with both labels
    const nodeCId = await page.evaluate(async () => {
      return await (window as any).vault.createEntity("note", "Node C");
    });
    await page.evaluate((id) => {
      (window as any).vault.selectedEntityId = id;
    }, nodeCId);
    await page.getByPlaceholder("Add label...").fill("faction-a");
    await page.getByPlaceholder("Add label...").press("Enter");
    await page.getByPlaceholder("Add label...").fill("faction-b");
    await page.getByPlaceholder("Add label...").press("Enter");

    // Wait for graph to render
    await page.waitForTimeout(1000);

    // 4. Helper to get visibility of specific nodes by label
    const getNodeVisibilities = async () => {
      return await page.evaluate(() => {
        const cy = (window as any).cy;
        if (!cy) {
          return {
            nodeAVisible: false,
            nodeBVisible: false,
            nodeCVisible: false,
          };
        }

        const isNodeWithLabelVisible = (label: string) => {
          const nodes = cy.nodes(`node[label = "${label}"]`);
          if (nodes.length === 0) return false;
          // At least one matching node must be visible
          return nodes.some((n: any) => n.visible());
        };

        return {
          nodeAVisible: isNodeWithLabelVisible("Node A"),
          nodeBVisible: isNodeWithLabelVisible("Node B"),
          nodeCVisible: isNodeWithLabelVisible("Node C"),
        };
      });
    };

    const waitForVisibilities = async (expected: {
      nodeAVisible: boolean;
      nodeBVisible: boolean;
      nodeCVisible: boolean;
    }) => {
      await expect
        .poll(async () => await getNodeVisibilities(), {
          timeout: 5000,
        })
        .toEqual(expected);
    };

    await waitForVisibilities({
      nodeAVisible: true,
      nodeBVisible: true,
      nodeCVisible: true,
    });

    // 5. Filter by "faction-a" - should hide Node B
    await page.getByRole("button", { name: /Labels \(0\)/ }).click();
    await page.getByRole("button", { name: "faction-a", exact: true }).click();

    await waitForVisibilities({
      nodeAVisible: true,
      nodeBVisible: false,
      nodeCVisible: true,
    });

    // 6. Clear all filters - should show all 3 again
    await page.getByRole("button", { name: "Clear All" }).click();

    await waitForVisibilities({
      nodeAVisible: true,
      nodeBVisible: true,
      nodeCVisible: true,
    });
  });
});

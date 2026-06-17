import { test, expect } from "@playwright/test";
import {
  openEntitySidepanel,
  openGraphContextMenuForTitle,
  seedEntities,
  seedEntity,
  selectGraphNodesByTitle,
  setupVaultPage,
} from "./test-helpers";

test.describe("Bulk Labeling and Selection Actions", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  test("should show label action in context menu when nodes are selected", async ({
    page,
  }) => {
    // 1. Create two entities
    await seedEntities(page, [{ title: "Node A" }, { title: "Node B" }]);

    // 2. Wait for graph to have the nodes
    await page.waitForFunction(
      () => {
        const cy = (window as any).cy;
        return cy && cy.nodes().length >= 2;
      },
      { timeout: 10000 },
    );

    // 3. Select both nodes and trigger context menu programmatically for reliability
    await selectGraphNodesByTitle(page, ["Node A", "Node B"]);
    await openGraphContextMenuForTitle(page, "Node A");

    // 4. Verify context menu action appears
    // The context menu text is currently hardcoded to "Nodes" in ContextMenu.svelte
    const labelAction = page
      .locator('[role="menuitem"]')
      .filter({ hasText: /Label 2 Nodes/ });
    await expect(labelAction).toBeVisible({ timeout: 10000 });
  });

  test("should open bulk label dialog and apply labels", async ({ page }) => {
    // 1. Create nodes
    await seedEntities(page, [{ title: "Alpha" }, { title: "Beta" }]);

    // 2. Wait for graph
    await page.waitForFunction(
      () => {
        const cy = (window as any).cy;
        return cy && cy.nodes().length >= 2;
      },
      { timeout: 10000 },
    );

    // 3. Select them and trigger context menu
    await selectGraphNodesByTitle(page, ["Alpha", "Beta"]);
    await openGraphContextMenuForTitle(page, "Alpha");

    // 4. Click Label action
    const labelAction = page
      .locator('[role="menuitem"]')
      .filter({ hasText: /Label 2 Nodes/ });
    await expect(labelAction).toBeVisible({ timeout: 10000 });
    await labelAction.click();

    // 5. Verify Dialog
    await expect(page.getByRole("dialog")).toBeVisible();
    // Use a more flexible regex for the header text as it uses jargon
    await expect(page.getByRole("heading", { name: /Label 2/i })).toBeVisible();

    // 6. Apply a new label
    const input = page.getByPlaceholder("Label name…");
    await input.fill("shared-tag");
    await page.getByRole("button", { name: "Apply to all" }).click();

    // 7. Verify notification and dialog close logic
    await expect(page.getByText(/Label "shared-tag" applied/)).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // 8. Check recent labels (trigger menu again)
    await selectGraphNodesByTitle(page, ["Alpha", "Beta"]);
    await openGraphContextMenuForTitle(page, "Alpha");

    const labelAction2 = page
      .locator('[role="menuitem"]')
      .filter({ hasText: /Label 2 Nodes/ });
    await expect(labelAction2).toBeVisible({ timeout: 10000 });
    await labelAction2.click();

    await input.click();
    await expect(page.getByText("Recent Labels")).toBeVisible();
    await expect(
      page.getByRole("option", { name: "shared-tag" }),
    ).toBeVisible();
  });

  test("should support AND/OR logic modes in label filter", async ({
    page,
  }) => {
    // 1. Setup entities with specific labels
    const alphaId = await seedEntity(page, { title: "Alpha" });

    // Open the panel
    await openEntitySidepanel(page, alphaId);
    await expect(page.getByPlaceholder("Add label...")).toBeVisible();

    const labelInput = page.getByPlaceholder("Add label...");
    await labelInput.fill("tag1");
    await labelInput.press("Enter");
    await expect(
      page.getByTestId("label-badge").filter({ hasText: "tag1" }),
    ).toBeVisible({ timeout: 10000 });

    await expect(labelInput).toHaveValue("");
    await labelInput.fill("tag2");
    await labelInput.press("Enter");
    await expect(
      page.getByTestId("label-badge").filter({ hasText: "tag2" }),
    ).toBeVisible({ timeout: 10000 });

    const betaId = await seedEntity(page, { title: "Beta" });

    await openEntitySidepanel(page, betaId);
    await expect(page.getByPlaceholder("Add label...")).toBeVisible();

    await labelInput.fill("tag1");
    await labelInput.press("Enter");
    await expect(
      page.getByTestId("label-badge").filter({ hasText: "tag1" }),
    ).toBeVisible({ timeout: 10000 });

    // Ensure all dropdowns are closed before starting
    await page.mouse.click(1, 1);

    // 2. Set up two active label filters and open the label filter menu.
    await page.evaluate(() => {
      (window as any).explorerUIStore.labelFilters = new Set(["tag1", "tag2"]);
    });
    const labelsBtn = page.getByRole("button", { name: /Labels \(/ });
    await expect(
      page.getByRole("button", { name: "Labels (2)" }),
    ).toBeVisible();
    await labelsBtn.click();

    // 3. Toggle to AND mode
    await page
      .getByText("Logic Mode")
      .locator("..")
      .getByRole("button")
      .click();
    // Verify Logic Mode button state
    await expect(
      page.locator("button:has-text('AND') .text-theme-primary"),
    ).toBeVisible();
  });

  test("should be able to search labels in filter dropdown", async ({
    page,
  }) => {
    // 1. Create many labels (need > 5 for search to appear)
    const targetId = await seedEntity(page, { title: "Target" });

    await openEntitySidepanel(page, targetId);
    await expect(page.getByPlaceholder("Add label...")).toBeVisible();

    const labels = [
      "apple1",
      "banana2",
      "cherry3",
      "date4",
      "elderberry5",
      "fig6",
    ];
    const labelInput = page.getByPlaceholder("Add label...");
    for (const l of labels) {
      await labelInput.fill(l);
      await labelInput.press("Enter");
      // Wait for the vault store to index the label before checking the UI.
      await page.waitForFunction(
        (label) => {
          const vault = (window as any).vault;
          const entity = Object.values(vault?.entities ?? {}).find(
            (entry: any) => entry.title === "Target",
          ) as any;
          return Boolean(
            entity?.labels?.includes(label) &&
            vault?.labelIndex?.includes(label),
          );
        },
        l,
        { timeout: 10000 },
      );
      // Wait for label to be added to the entity (reactive update)
      await expect(
        page.getByTestId("label-badge").filter({ hasText: l }),
      ).toBeVisible({ timeout: 10000 });
      // Small delay to prevent race conditions in VaultStore when adding many labels rapidly
      await page.waitForTimeout(100);
    }

    // 2. Open filter
    await page.getByRole("button", { name: /Labels \(/ }).click();

    // 3. Search for 'cherry'
    const searchInput = page.getByPlaceholder("Search labels...");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("cherry");

    // 4. Verify results
    await expect(
      page.getByRole("button", { name: /^cherry3\b/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^apple1\b/ }),
    ).not.toBeVisible();
  });
});

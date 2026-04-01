import { test, expect } from "@playwright/test";

test.describe("Bulk Labeling and Selection Actions", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("codex_skip_landing", "true");
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
    });

    await page.goto("/");

    // Wait for system to boot and vault to be ready
    await page.waitForFunction(() => (window as any).vault?.status === "idle", {
      timeout: 15000,
    });

    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 20000,
    });
  });

  test("should show label action in context menu when nodes are selected", async ({
    page,
  }) => {
    // 1. Create two entities
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder(/Title\.\.\./).fill("Node A");
    await page.getByRole("button", { name: "ADD" }).click();

    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder(/Title\.\.\./).fill("Node B");
    await page.getByRole("button", { name: "ADD" }).click();

    // 2. Wait for graph to have the nodes
    await page.waitForFunction(
      () => {
        const cy = (window as any).cy;
        return cy && cy.nodes().length >= 2;
      },
      { timeout: 10000 },
    );

    // 3. Select both nodes and trigger context menu programmatically for reliability
    await page.evaluate(() => {
      const cy = (window as any).cy;
      const vault = (window as any).vault;
      const ids = Object.values(vault.entities)
        .filter((entity: any) => ["Node A", "Node B"].includes(entity.title))
        .map((entity: any) => entity.id);
      ids.forEach((id: string) => cy.$id(id).select());
      const node = cy.$id(ids[0]);
      // Trigger context menu event on the node
      node.trigger("cxttap", { renderedPosition: node.renderedPosition() });
    });

    // 4. Verify context menu action appears
    // The context menu text is currently hardcoded to "Nodes" in ContextMenu.svelte
    const labelAction = page
      .locator('[role="menuitem"]')
      .filter({ hasText: /Label 2 Nodes/ });
    await expect(labelAction).toBeVisible({ timeout: 10000 });
  });

  test("should open bulk label dialog and apply labels", async ({ page }) => {
    // 1. Create nodes
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder(/Title\.\.\./).fill("Alpha");
    await page.getByRole("button", { name: "ADD" }).click();
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder(/Title\.\.\./).fill("Beta");
    await page.getByRole("button", { name: "ADD" }).click();

    // 2. Wait for graph
    await page.waitForFunction(
      () => {
        const cy = (window as any).cy;
        return cy && cy.nodes().length >= 2;
      },
      { timeout: 10000 },
    );

    // 3. Select them and trigger context menu
    await page.evaluate(() => {
      const cy = (window as any).cy;
      const vault = (window as any).vault;
      const ids = Object.values(vault.entities)
        .filter((entity: any) => ["Alpha", "Beta"].includes(entity.title))
        .map((entity: any) => entity.id);
      ids.forEach((id: string) => cy.$id(id).select());
      const node = cy.$id(ids[0]);
      node.trigger("cxttap", { renderedPosition: node.renderedPosition() });
    });

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
    await page.evaluate(() => {
      const cy = (window as any).cy;
      const vault = (window as any).vault;
      const ids = Object.values(vault.entities)
        .filter((entity: any) => ["Alpha", "Beta"].includes(entity.title))
        .map((entity: any) => entity.id);
      ids.forEach((id: string) => cy.$id(id).select());
      const node = cy.$id(ids[0]);
      node.trigger("cxttap", { renderedPosition: node.renderedPosition() });
    });

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
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder(/Title\.\.\./).fill("Alpha");
    await page.getByRole("button", { name: "ADD" }).click();

    // Open the panel
    await page.locator("aside").getByText("Alpha").click();
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

    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder(/Title\.\.\./).fill("Beta");
    await page.getByRole("button", { name: "ADD" }).click();

    await page.locator("aside").getByText("Beta").click();
    await expect(page.getByPlaceholder("Add label...")).toBeVisible();

    await labelInput.fill("tag1");
    await labelInput.press("Enter");
    await expect(
      page.getByTestId("label-badge").filter({ hasText: "tag1" }),
    ).toBeVisible({ timeout: 10000 });

    // Ensure all dropdowns are closed before starting
    await page.mouse.click(1, 1);

    // 2. Open Filter and select tag1
    await page.getByRole("button", { name: /Labels \(/ }).click();
    const tag1Btn = page.getByRole("button", { name: "tag1", exact: true });
    await expect(tag1Btn).toBeVisible();
    await tag1Btn.click();

    // 3. Select tag2 (re-open if needed)
    const labelsBtn = page.getByRole("button", { name: /Labels \(/ });
    const tag2Btn = page.getByRole("button", { name: "tag2", exact: true });
    if (!(await tag2Btn.isVisible())) {
      await labelsBtn.click();
    }
    await expect(tag2Btn).toBeVisible();
    await tag2Btn.click();
    await expect(
      page.getByRole("button", { name: "Labels (2)" }),
    ).toBeVisible();

    // 4. Toggle to AND mode
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
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder(/Title\.\.\./).fill("Target");
    await page.getByRole("button", { name: "ADD" }).click();

    await page.locator("aside").getByText("Target").click();
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
      page.getByRole("button", { name: "cherry3", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "apple1", exact: true }),
    ).not.toBeVisible();
  });
});

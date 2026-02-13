import { test, expect } from "@playwright/test";

test.describe("Node Merging", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for vault to initialize
    await page.waitForFunction(
      () =>
        (window as any).vault?.isInitialized &&
        (window as any).vault?.status === "idle",
    );
  });

  test("should merge two nodes and preserve content and links", async ({
    page,
  }) => {
    // 1. Setup Data
    await page.evaluate(async () => {
      const v = (window as any).vault;
      // Clear checking for existing checks to avoid duplicates if re-running without reload
      // But verify we can write.
      await v.createEntity("note", "Node A", {
        id: "node-a",
        content: "Content from A",
      });
      await v.createEntity("note", "Node B", {
        id: "node-b",
        content: "Content from B",
      });
    });

    // 2. Open Merge Dialog
    await page.evaluate(() => {
      (window as any).uiStore.openMergeDialog(["node-a", "node-b"]);
    });

    // 3. Verify Dialog Open
    await expect(page.getByText("Merge 2 Nodes")).toBeVisible();

    // 4. Trigger Concatenate
    await page.getByRole("button", { name: "Concatenate" }).click();

    // 5. Verify Preview
    const preview = page.locator("textarea");
    // Using toHaveValue as it correctly waits for the value binding in Svelte
    await expect(preview).toHaveValue(/Content from B/, { timeout: 10000 });
    await expect(preview).toHaveValue(/Content from A/, { timeout: 10000 });

    // 6. Confirm Merge
    await page.getByRole("button", { name: "Confirm Merge" }).click();

    // 7. Verify Result
    // Dialog should close
    await expect(page.getByText("Merge 2 Nodes")).not.toBeVisible();

    // Node B should be gone, Node A should have merged content
    const nodeAContent = await page.evaluate(async () => {
      return (window as any).vault.entities["node-a"]?.content;
    });
    expect(nodeAContent).toContain("Content from A");
    expect(nodeAContent).toContain("Content from B");

    const nodeB = await page.evaluate(async () => {
      return (window as any).vault.entities["node-b"];
    });
    expect(nodeB).toBeUndefined();
  });

  test("should update backlinks when merging nodes", async ({ page }) => {
    // 1. Setup Data with backlink from Node C -> Node B
    await page.evaluate(async () => {
      const v = (window as any).vault;
      await v.createEntity("note", "Node A", {
        id: "node-a",
        content: "Content from A",
      });
      await v.createEntity("note", "Node B", {
        id: "node-b",
        content: "Content from B",
      });
      await v.createEntity("note", "Node C", {
        id: "node-c",
        content: "This note links to [[Node B]]",
      });
    });

    // 2. Open Merge Dialog for Node A and Node B
    await page.evaluate(() => {
      (window as any).uiStore.openMergeDialog(["node-a", "node-b"]);
    });

    // 3. Verify Dialog Open
    await expect(page.getByText("Merge 2 Nodes")).toBeVisible();

    // 4. Trigger Concatenate
    await page.getByRole("button", { name: "Concatenate" }).click();

    // 5. Confirm Merge
    await page.getByRole("button", { name: "Confirm Merge" }).click();

    // 6. Verify Dialog Closed
    await expect(page.getByText("Merge 2 Nodes")).not.toBeVisible();

    // 7. Verify that Node C's wikilink now points to Node A instead of Node B
    const nodeCContent = await page.evaluate(async () => {
      return (window as any).vault.entities["node-c"]?.content;
    });
    expect(nodeCContent).toContain("[[Node A]]");
    expect(nodeCContent).not.toContain("[[Node B]]");
  });

  test("should preserve connections when merging nodes", async ({ page }) => {
    // 1. Setup Data with connections
    await page.evaluate(async () => {
      const v = (window as any).vault;
      await v.createEntity("note", "Node A", {
        id: "node-a",
      });
      await v.createEntity("note", "Node B", {
        id: "node-b",
      });
      await v.createEntity("note", "Node C", {
        id: "node-c",
      });
      await v.createEntity("note", "Node D", {
        id: "node-d",
      });

      // Node A -> Node C
      await v.addConnection(
        "node-a",
        "node-c",
        "related_to",
        "link from A to C",
      );
      // Node B -> Node D
      await v.addConnection(
        "node-b",
        "node-d",
        "related_to",
        "link from B to D",
      );
    });

    // 2. Open Merge Dialog for Node A and Node B
    await page.evaluate(() => {
      (window as any).uiStore.openMergeDialog(["node-a", "node-b"]);
    });

    // 3. Verify Dialog Open
    await expect(page.getByText("Merge 2 Nodes")).toBeVisible();

    // 4. Trigger Concatenate
    await page.getByRole("button", { name: "Concatenate" }).click();

    // 5. Confirm Merge
    await page.getByRole("button", { name: "Confirm Merge" }).click();

    // 6. Verify Dialog Closed
    await expect(page.getByText("Merge 2 Nodes")).not.toBeVisible();

    // 7. Verify Node A now has connections to Node C and Node D
    const nodeA = await page.evaluate(async () => {
      return (window as any).vault.entities["node-a"];
    });

    expect(nodeA.connections).toHaveLength(2);
    expect(nodeA.connections).toContainEqual(
      expect.objectContaining({ target: "node-c", label: "link from A to C" }),
    );
    expect(nodeA.connections).toContainEqual(
      expect.objectContaining({ target: "node-d", label: "link from B to D" }),
    );
  });

  test.describe("Documentation & Hints", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/");
      // Wait for vault to initialize
      await page.waitForFunction(
        () =>
          (window as any).vault?.isInitialized &&
          (window as any).vault?.status === "idle",
      );
      // Clear help state to ensure hints appear
      await page.evaluate(() => {
        localStorage.clear();
      });
      await page.reload();
      await page.waitForFunction(
        () =>
          (window as any).vault?.isInitialized &&
          (window as any).vault?.status === "idle",
      );
    });

    test("should show the node merging help article", async ({ page }) => {
      // 1. Open Settings -> Help
      await page.getByTestId("settings-button").click();
      await page.getByRole("tab", { name: "Help" }).click();

      // 2. Search for merging
      const searchInput = page.getByPlaceholder("Search documentation...");
      await searchInput.fill("merging");

      // 3. Verify article title is visible
      await expect(page.getByText("Merging Entities")).toBeVisible();

      // 4. Click article and check content
      await page.getByText("Merging Entities").click();
      await expect(page.getByText("Consolidation Power")).toBeVisible();
      await expect(page.getByText("Select Multiple Nodes")).toBeVisible();
    });

    test("should trigger node-merging feature hint when 2 nodes are selected", async ({
      page,
    }) => {
      // 1. Create two entities
      await page.evaluate(async () => {
        const v = (window as any).vault;
        await v.createEntity("note", "Node A", { id: "node-a" });
        await v.createEntity("note", "Node B", { id: "node-b" });
      });

      // 2. Wait for idle
      await page.waitForFunction(
        () => (window as any).vault?.status === "idle",
      );

      // 3. Verify hint NOT visible initially
      await expect(page.getByText("Consolidation Power")).not.toBeVisible();

      // 4. Select two nodes via Cytoscape API
      await page.evaluate(() => {
        const cy = (window as any).cy;
        cy.$id("node-a").select();
        cy.$id("node-b").select();
      });

      // 5. Verify hint appears
      await expect(page.getByText("Consolidation Power")).toBeVisible();
      await expect(
        page.getByText("You can merge multiple nodes"),
      ).toBeVisible();

      // 6. Dismiss hint
      await page.getByTestId("dismiss-hint-button").click();
      await expect(page.getByText("Consolidation Power")).not.toBeVisible();

      // 7. Unselect and re-select to verify it stays dismissed
      await page.evaluate(() => {
        const cy = (window as any).cy;
        cy.nodes().unselect();
        cy.$id("node-a").select();
        cy.$id("node-b").select();
      });
      await expect(page.getByText("Consolidation Power")).not.toBeVisible();
    });
  });
});

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
});

import { test, expect } from "@playwright/test";

test.describe("Bulk Labeling and Selection Actions", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("codex_skip_landing", "true");
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
    });
    await page.goto("http://localhost:5173/");
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

    // 2. Select both nodes
    await page.evaluate(() => {
      const cy = (window as any).cy;
      cy.nodes().select();
    });

    // 3. Right click on a node to show context menu
    const canvas = page.getByTestId("graph-canvas");
    await canvas.click({ button: "right" });

    // 4. Verify context menu action appears
    const labelAction = page.getByRole("menuitem", { name: /Label 2 Nodes/ });
    await expect(labelAction).toBeVisible();
  });

  test("should open bulk label dialog and apply labels", async ({ page }) => {
    // 1. Create nodes and select them
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder(/Title\.\.\./).fill("Alpha");
    await page.getByRole("button", { name: "ADD" }).click();
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder(/Title\.\.\./).fill("Beta");
    await page.getByRole("button", { name: "ADD" }).click();

    await page.evaluate(() => {
      (window as any).cy.nodes().select();
    });

    // 2. Right click to open context menu
    const canvas = page.getByTestId("graph-canvas");
    await canvas.click({ button: "right" });

    // 3. Click Label action
    await page.getByRole("menuitem", { name: /Label 2 Nodes/ }).click();

    // 4. Verify Dialog
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/Label 2 Chronicles/i)).toBeVisible();

    // 5. Apply a new label
    const input = page.getByPlaceholder("Label name…");
    await input.fill("shared-tag");
    await page.getByRole("button", { name: "Apply to all" }).click();

    // 6. Verify notification and dialog close logic
    await expect(page.getByText(/Label "shared-tag" applied/)).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // 7. Check recent labels
    await canvas.click({ button: "right" });
    await page.getByRole("menuitem", { name: /Label 2 Nodes/ }).click();
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
    await expect(page.locator("aside").getByText("Alpha")).toBeVisible();
    await page.locator("aside").getByText("Alpha").click();
    await page.getByPlaceholder("Add label...").fill("tag1");
    await page.getByPlaceholder("Add label...").press("Enter");
    await expect(page.getByText("tag1").first()).toBeVisible();
    await page.getByPlaceholder("Add label...").fill("tag2");
    await page.getByPlaceholder("Add label...").press("Enter");
    await expect(page.getByText("tag2").first()).toBeVisible();

    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder(/Title\.\.\./).fill("Beta");
    await page.getByRole("button", { name: "ADD" }).click();
    await expect(page.locator("aside").getByText("Beta")).toBeVisible();
    await page.locator("aside").getByText("Beta").click();
    await page.getByPlaceholder("Add label...").fill("tag1");
    await page.getByPlaceholder("Add label...").press("Enter");
    await expect(page.getByText("tag1").first()).toBeVisible();

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

    const labels = [
      "apple1",
      "banana2",
      "cherry3",
      "date4",
      "elderberry5",
      "fig6",
    ];
    for (const l of labels) {
      const input = page.getByPlaceholder("Add label...");
      await input.fill(l);
      await input.press("Enter");
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

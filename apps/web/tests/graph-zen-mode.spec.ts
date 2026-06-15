import { test, expect } from "@playwright/test";
import { seedEntity, setupVaultPage } from "./test-helpers";

test.describe("Graph Zen Mode", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  test("should open Zen mode directly from a graph node double click", async ({
    page,
  }) => {
    const nodeId = await seedEntity(page, {
      title: "Double Click Node",
      content: "Opened from a graph double click.",
    });

    await page.evaluate((id) => {
      const cy = (window as any).cy;
      const node = cy.$id(id);
      node.trigger("dbltap", { renderedPosition: node.renderedPosition() });
    }, nodeId);

    const modal = page.getByTestId("zen-mode-modal");
    await expect(modal).toBeVisible();
    await expect(modal.getByTestId("entity-title")).toHaveText(
      "Double Click Node",
    );
    await expect(page.getByRole("complementary")).toBeHidden();
  });
});

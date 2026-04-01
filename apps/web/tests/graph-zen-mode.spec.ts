import { test, expect } from "@playwright/test";

test.describe("Graph Zen Mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).DISABLE_ONBOARDING = true;
      (window as any).__E2E__ = true;
      localStorage.setItem("codex_skip_landing", "true");
    });

    await page.goto("/");
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should open Zen mode directly from a graph node double click", async ({
    page,
  }) => {
    await page.getByTestId("new-entity-button").click();
    await page.getByPlaceholder("Chronicle Title...").fill("Double Click Node");
    await page.getByRole("button", { name: "ADD" }).click();

    const nodeIdHandle = await page.waitForFunction(
      () => {
        const vault = (window as any).vault;
        const entity = Object.values(vault?.entities || {}).find(
          (item: any) => item.title === "Double Click Node",
        );
        return entity ? (entity as any).id : null;
      },
      { timeout: 10000 },
    );
    const nodeId = (await nodeIdHandle.jsonValue()) as string;

    await page.waitForFunction(
      (id) => {
        const cy = (window as any).cy;
        return cy && cy.$id(id).length > 0;
      },
      nodeId,
      { timeout: 10000 },
    );

    const canvasBox = await page.getByTestId("graph-canvas").boundingBox();
    const nodePosition = await page.evaluate((id) => {
      const cy = (window as any).cy;
      return cy.$id(id).renderedPosition();
    }, nodeId);

    expect(canvasBox).not.toBeNull();
    if (!canvasBox) return;

    await page.mouse.dblclick(
      canvasBox.x + nodePosition.x,
      canvasBox.y + nodePosition.y,
    );

    const modal = page.getByTestId("zen-mode-modal");
    await expect(modal).toBeVisible();
    await expect(modal.getByTestId("entity-title")).toHaveText(
      "Double Click Node",
    );
    await page.waitForTimeout(300);
    await expect(page.getByRole("complementary")).toBeHidden();
  });
});

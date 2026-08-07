import { test, expect } from "@playwright/test";
import {
  openEntitySidepanel,
  seedEntities,
  setupVaultPage,
} from "./test-helpers";

test.describe("Responsive Entity Detail Panel", () => {
  const longEntityName =
    "Archmage Thaddeus Bartholomew III of the High Council of Elements";
  const longLabel =
    "Extremely Long Label That Might Break The Layout If Not Carefully Managed";

  const fixtures = [
    {
      id: "stress-test-entity",
      title: longEntityName,
      labels: ["mage", longLabel],
      screenshotName: "stress",
    },
    {
      id: "normal-entity",
      title: "Bob",
      labels: ["human"],
      screenshotName: "ordinary",
    },
  ];

  const viewports = [
    { width: 1280, height: 800 },
    { width: 1440, height: 900 },
    { width: 1600, height: 1000 },
  ];

  for (const fixture of fixtures) {
    for (const viewport of viewports) {
      test(`keeps ${fixture.screenshotName} content usable at ${viewport.width}px`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await page.addInitScript(() => {
          localStorage.setItem("codex_guided_mode_active", "false");
        });
        await setupVaultPage(page);
        await seedEntities(
          page,
          fixtures.map((entity) => ({
            id: entity.id,
            title: entity.title,
            type: "character",
            content: "This is a test character.",
            data: { labels: entity.labels },
          })),
        );
        await openEntitySidepanel(page, fixture.id);

        const panel = page.getByTestId("entity-detail-panel");
        await expect(panel).toBeVisible();
        await expect(page.getByTestId("import-vault-button")).toBeVisible();

        const title = panel.getByRole("heading", { name: fixture.title });
        const label = panel.getByText(fixture.labels.at(-1)!);
        await expect(title).toBeVisible();
        await expect(label).toBeVisible();
        expect(
          await title.evaluate(
            (element) =>
              Math.ceil(element.scrollWidth) <= Math.ceil(element.clientWidth),
          ),
        ).toBeTruthy();
        expect(
          await label.evaluate(
            (element) =>
              Math.ceil(element.scrollWidth) <= Math.ceil(element.clientWidth),
          ),
        ).toBeTruthy();

        const hasHorizontalScroll = await page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
        );
        expect(hasHorizontalScroll).toBeFalsy();

        const tabList = panel.getByRole("tablist");
        const tabListBounds = await tabList.boundingBox();
        const panelBounds = await panel.boundingBox();
        if (tabListBounds && panelBounds) {
          expect(tabListBounds.width).toBeLessThanOrEqual(panelBounds.width);
        }

        for (const actionName of [
          "AI Revise Description",
          "Find in Graph",
          "Sound bite",
          "Enter Zen Mode",
          "Close panel",
          "DELETE",
          "EDIT",
        ]) {
          await expect(
            panel.getByRole("button", { name: actionName }),
          ).toBeVisible();
        }

        await expect(panel).toHaveScreenshot(
          `entity-panel-${fixture.screenshotName}-${viewport.width}.png`,
          { maxDiffPixelRatio: 0.1 },
        );

        await panel.getByTestId("tab-status").focus();
        await panel.getByTestId("tab-status").press("End");
        const finalTab = panel.getByTestId("tab-timeline");
        await expect(finalTab).toBeFocused();
        await expect(finalTab).toHaveCSS("outline-style", "solid");
        await expect(finalTab).toHaveCSS("outline-width", "2px");
        const finalTabIsVisible = await finalTab.evaluate((element) => {
          const tab = element.getBoundingClientRect();
          const list = element
            .closest('[role="tablist"]')
            ?.getBoundingClientRect();
          const tolerance = 1;
          return (
            !!list &&
            tab.left >= list.left - tolerance &&
            tab.right <= list.right + tolerance
          );
        });
        expect(finalTabIsVisible).toBeTruthy();
      });
    }
  }
});

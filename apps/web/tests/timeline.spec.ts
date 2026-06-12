import { test, expect } from "@playwright/test";
import { seedEntities, setupVaultPage } from "./test-helpers";

async function waitForCytoscapeNodes(page: any, ids: string[]) {
  await page.waitForFunction(
    (expectedIds: string[]) => {
      const cy = (window as any).cy;
      if (!cy) return false;
      return expectedIds.every((id) => {
        const node = cy.$id(id);
        return !node.empty();
      });
    },
    ids,
    { timeout: 15000 },
  );
}

test.describe("World Timeline - Graph Integration", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  test("should toggle timeline mode", async ({ page }) => {
    // 1. Seed entities
    await seedEntities(page, [
      {
        id: "event-1",
        title: "Event 1",
        type: "event",
        data: { date: { year: 1000 } },
      },
      {
        id: "event-2",
        title: "Event 2",
        type: "event",
        data: { date: { year: 2000 } },
      },
      { id: "undated-event", title: "Undated Event", type: "event" },
    ]);

    // Wait for Cytoscape to load nodes
    await waitForCytoscapeNodes(page, ["event-1", "event-2", "undated-event"]);

    // 2. Toggle Timeline
    const timelineBtn = page.getByTitle("Toggle Chronological Timeline Mode");
    await expect(timelineBtn).toBeVisible();
    await timelineBtn.click();

    // 3. Verify status indicator
    await expect(page.getByText("Timeline Active (Horizontal)")).toBeVisible();

    // Wait for layout to settle
    await page.waitForTimeout(1000);

    // 4. Verify node positions
    const positions = await page.evaluate(() => {
      const { cy } = window as any;
      if (!cy) return null;
      const e1 = cy.$id("event-1");
      const e2 = cy.$id("event-2");
      if (e1.empty() || e2.empty()) return null;
      return {
        e1: e1.position(),
        e2: e2.position(),
      };
    });

    expect(positions).not.toBeNull();
    if (positions) {
      // Event 2 (Year 2000) should be to the right of Event 1 (Year 1000)
      expect(positions.e2.x).toBeGreaterThan(positions.e1.x);
    }
  });

  test("should hide undated nodes in timeline mode", async ({ page }) => {
    // Seed entities
    await seedEntities(page, [
      {
        id: "event-1",
        title: "Event 1",
        type: "event",
        data: { date: { year: 1000 } },
      },
      {
        id: "event-2",
        title: "Event 2",
        type: "event",
        data: { date: { year: 2000 } },
      },
      { id: "undated-event", title: "Undated Event", type: "event" },
    ]);

    // Wait for Cytoscape to load nodes
    await waitForCytoscapeNodes(page, ["event-1", "event-2", "undated-event"]);

    // Verify undated node (undated-event) is visible before toggling timeline mode
    await page.waitForFunction(() => {
      const { cy } = window as any;
      if (!cy) return false;
      const node = cy.$id("undated-event");
      return node && node.visible();
    });

    const timelineBtn = page.getByTitle("Toggle Chronological Timeline Mode");
    await timelineBtn.click();

    // Verify undated node is now hidden in timeline mode
    await page.waitForFunction(() => {
      const { cy } = window as any;
      if (!cy) return false;
      const node = cy.$id("undated-event");
      return node && !node.visible();
    });
  });

  test("should show range handles and hide main range nodes in chronology edit mode", async ({
    page,
  }) => {
    // 1. Seed a range-based entity and a point-in-time event entity
    await seedEntities(page, [
      {
        id: "range-entity",
        title: "Range Entity",
        type: "event",
        data: {
          start_date: { year: 1000 },
          end_date: { year: 1500 },
        },
      },
      {
        id: "point-entity",
        title: "Point Entity",
        type: "event",
        data: {
          date: { year: 1200 },
        },
      },
    ]);

    // Wait for Cytoscape to load nodes
    await waitForCytoscapeNodes(page, ["range-entity", "point-entity"]);

    // 2. Toggle Timeline Mode
    const timelineBtn = page.getByTitle("Toggle Chronological Timeline Mode");
    await expect(timelineBtn).toBeVisible();
    await timelineBtn.click();

    // Verify timeline is active
    await expect(page.getByText("Timeline Active (Horizontal)")).toBeVisible();

    // 3. Toggle Edit Chronology Mode
    const editBtn = page.getByTitle("Edit Chronology");
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Wait for handles to be generated in Cytoscape
    await waitForCytoscapeNodes(page, [
      "range-entity",
      "point-entity",
      "range-entity::primary-range-start",
      "range-entity::primary-range-end",
    ]);

    // Wait for layout and styles to settle
    await page.waitForTimeout(1000);

    // 4. Verify in cytoscape that:
    // - "point-entity" is visible (opacity > 0)
    // - "range-entity::primary-range-start" and "range-entity::primary-range-end" are visible
    // - "range-entity" (the main range node) is hidden (opacity === 0)
    const visibilityStates = await page.evaluate(() => {
      const { cy } = window as any;
      if (!cy) return null;

      const pNode = cy.$id("point-entity");
      const rNode = cy.$id("range-entity");
      const startNode = cy.$id("range-entity::primary-range-start");
      const endNode = cy.$id("range-entity::primary-range-end");

      if (
        pNode.empty() ||
        rNode.empty() ||
        startNode.empty() ||
        endNode.empty()
      )
        return null;

      return {
        pointVisible: pNode.visible() && pNode.style("opacity") > 0,
        mainRangeHidden:
          !rNode.visible() || Number(rNode.style("opacity")) === 0,
        startVisible: startNode.visible() && startNode.style("opacity") > 0,
        endVisible: endNode.visible() && endNode.style("opacity") > 0,
        mainX: rNode.position().x,
        startX: startNode.position().x,
        mainY: rNode.position().y,
        startY: startNode.position().y,
      };
    });

    expect(visibilityStates).not.toBeNull();
    if (visibilityStates) {
      expect(visibilityStates.pointVisible).toBe(true);
      expect(visibilityStates.mainRangeHidden).toBe(true);
      expect(visibilityStates.startVisible).toBe(true);
      expect(visibilityStates.endVisible).toBe(true);
      // The main node's position should be exactly equal to the start handle's position
      expect(visibilityStates.mainX).toBeCloseTo(visibilityStates.startX, 1);
      expect(visibilityStates.mainY).toBeCloseTo(visibilityStates.startY, 1);
    }
  });
});

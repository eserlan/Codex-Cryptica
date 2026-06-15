import { test, expect } from "@playwright/test";
import { setupVaultPage, seedEntities } from "./test-helpers";

test.describe("World Timeline - Graph Integration", () => {
  test.beforeEach(async ({ page }) => {
    await setupVaultPage(page);
  });

  test("should toggle timeline mode", async ({ page }) => {
    // 1. Create entities via API
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
      { id: "event-3", title: "Undated Event", type: "event" },
    ]);

    // 2. Toggle Timeline
    const timelineBtn = page.getByTitle("Toggle Chronological Timeline Mode");
    await expect(timelineBtn).toBeVisible();
    await timelineBtn.click();

    // 3. Verify status indicator
    await expect(
      page.getByText("Chronological Synchrony Active"),
    ).toBeVisible();

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
    // 1. Create entities via API
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

    // 2. Verify undated node (undated-event) is visible before toggling timeline mode
    await page.waitForFunction(() => {
      const { cy } = window as any;
      if (!cy) return false;
      const node = cy.$id("undated-event");
      return node && node.visible();
    });

    // 3. Toggle timeline
    const timelineBtn = page.getByTitle("Toggle Chronological Timeline Mode");
    await expect(timelineBtn).toBeVisible();
    await timelineBtn.click();

    // 4. Verify undated node is now hidden in timeline mode
    await page.waitForFunction(() => {
      const { cy } = window as any;
      if (!cy) return false;
      const node = cy.$id("undated-event");
      return node && !node.visible();
    });
  });
});

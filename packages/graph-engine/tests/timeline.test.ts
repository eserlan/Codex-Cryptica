import { describe, it, expect } from "vitest";
import { getTimelineLayout, hasTimelineDate } from "../src/layouts/timeline";
import { getRulerTicks } from "../src/renderer/overlays";
import type { GraphNode } from "../src/transformer";

describe("Timeline Layout", () => {
  const mockNodes: GraphNode[] = [
    {
      group: "nodes",
      data: {
        id: "n1",
        label: "Node 1",
        type: "npc",
        weight: 0,
        date: { year: 1000 },
      },
    },
    {
      group: "nodes",
      data: {
        id: "n2",
        label: "Node 2",
        type: "npc",
        weight: 0,
        date: { year: 1100 },
      },
    },
    {
      group: "nodes",
      data: {
        id: "n3",
        label: "Node 3",
        type: "npc",
        weight: 0,
        date: { year: 1000 },
      },
    },
  ];

  it("should calculate horizontal positions based on year", () => {
    const positions = getTimelineLayout(mockNodes, {
      axis: "x",
      scale: 10,
      jitter: 50,
      minYear: 1000,
    });

    // Sequential layout:
    // 1000 -> 0
    // 1100 -> diff 100. Base scale 10. Gap > 20 (+4). Total 14.
    expect(positions["n1"].x).toBe(0);
    expect(positions["n2"].x).toBe(14);
    expect(positions["n3"].x).toBe(0);
  });

  it("should apply jitter to concurrent events", () => {
    const positions = getTimelineLayout(mockNodes, {
      axis: "x",
      scale: 10,
      jitter: 50,
      minYear: 1000,
    });

    // n1 and n3 both have year 1000
    // Secondary coords should be symmetric around 100 (offset)
    expect(positions["n1"].y).toBe(75);
    expect(positions["n3"].y).toBe(125);
  });

  it("should handle vertical orientation", () => {
    const positions = getTimelineLayout(mockNodes, {
      axis: "y",
      scale: 10,
      jitter: 50,
      minYear: 1000,
    });

    expect(positions["n1"].y).toBe(0);
    expect(positions["n2"].y).toBe(14);
    expect(positions["n1"].x).toBe(75);
  });

  it("should space out events horizontally within the same year if they have different months/days and stack if they have the same date", () => {
    const nodes: GraphNode[] = [
      {
        group: "nodes",
        data: {
          id: "event-sep",
          label: "September Event",
          type: "event",
          weight: 0,
          date: { year: 1005, month: 9, day: 15 },
        },
      },
      {
        group: "nodes",
        data: {
          id: "event-oct",
          label: "October Event",
          type: "event",
          weight: 0,
          date: { year: 1005, month: 10, day: 1 },
        },
      },
      {
        group: "nodes",
        data: {
          id: "event-sep-dup",
          label: "September Event 2",
          type: "event",
          weight: 0,
          date: { year: 1005, month: 9, day: 15 },
        },
      },
    ];

    const positions = getTimelineLayout(nodes, {
      axis: "x",
      scale: 100,
      jitter: 50,
      zoom: 1.0,
    });

    // September Event and October Event have different dates, so they spread out horizontally
    expect(positions["event-sep"].x).not.toBe(positions["event-oct"].x);
    // October Event is unique, so it sits on the baseline Y = 100
    expect(positions["event-oct"].y).toBe(100);

    // September Event and September Event 2 have the exact same date, so they stack vertically (different Y, same X)
    expect(positions["event-sep"].x).toBe(positions["event-sep-dup"].x);
    expect(positions["event-sep"].y).toBe(75);
    expect(positions["event-sep-dup"].y).toBe(125);
  });

  it("should detect nodes without timeline metadata", () => {
    const undatedNode: GraphNode = {
      group: "nodes",
      data: { id: "n4", label: "Node 4", type: "npc", weight: 0 },
    };

    const nodeWithStartDate: GraphNode = {
      group: "nodes",
      data: {
        id: "n5",
        label: "Node 5",
        type: "event",
        weight: 0,
        start_date: { year: 2000 },
      },
    };

    const nodeWithEndDate: GraphNode = {
      group: "nodes",
      data: {
        id: "n6",
        label: "Node 6",
        type: "event",
        weight: 0,
        end_date: { year: 2024 },
      },
    };

    expect(hasTimelineDate(mockNodes[0])).toBe(true);
    expect(hasTimelineDate(undatedNode)).toBe(false);
    expect(hasTimelineDate(nodeWithStartDate)).toBe(true);
    expect(hasTimelineDate(nodeWithEndDate)).toBe(true);
  });

  it("should floor and deduplicate fractional years in getRulerTicks", () => {
    const yearPositions = {
      1005: 100,
      1005.67: 200,
      1005.75: 300,
      1006: 400,
    };
    const ticks = getRulerTicks(yearPositions);

    // Should only have 1005 (at coordinate 100) and 1006 (at coordinate 400)
    expect(ticks).toHaveLength(2);
    expect(ticks[0]).toEqual({
      year: 1005,
      pos: 100,
      isMajor: true,
      label: "1005",
      type: "year",
    });
    expect(ticks[1]).toEqual({
      year: 1006,
      pos: 400,
      isMajor: false,
      label: "1006",
      type: "year",
    });
  });

  it("should generate months and days ticks at deeper zoom levels in getRulerTicks", () => {
    const yearPositions = {
      1005: 100,
      1005.67: 200,
      1006: 300,
    };

    // Zoom 3.0: should show year + month ticks
    const monthTicks = getRulerTicks(yearPositions, 3.0);
    const monthsFor1005 = monthTicks.filter(
      (t) => t.year === 1005 && t.type === "month",
    );
    expect(monthsFor1005.length).toBeGreaterThan(0);
    expect(monthsFor1005.length).toBe(1);
    expect(monthsFor1005[0].label).toBeDefined();

    // Zoom 8.0: should show days ticks
    const dayTicks = getRulerTicks(yearPositions, 8.0);
    const daysFor1005 = dayTicks.filter(
      (t) => t.year === 1005 && t.type === "day",
    );
    expect(daysFor1005.length).toBeGreaterThan(0);
    expect(daysFor1005.length).toBe(1);
  });

  it("should place main nodes at their start handle position and not stack them when handles are present", () => {
    const nodes: GraphNode[] = [
      {
        group: "nodes",
        data: {
          id: "entity-1",
          label: "Entity 1",
          type: "npc",
          weight: 0,
          start_date: { year: 1000 },
          end_date: { year: 1100 },
        },
      },
      {
        group: "nodes",
        data: {
          id: "entity-1::primary-range-start",
          entityId: "entity-1",
          anchorId: "primary-range-start",
          anchorType: "rangeStart",
          isTemporalAnchor: true,
          label: "Entity 1 - start",
          date: { year: 1000 },
        },
      },
      {
        group: "nodes",
        data: {
          id: "entity-1::primary-range-end",
          entityId: "entity-1",
          anchorId: "primary-range-end",
          anchorType: "rangeEnd",
          isTemporalAnchor: true,
          label: "Entity 1 - end",
          date: { year: 1100 },
        },
      },
    ];

    const positions = getTimelineLayout(nodes, {
      axis: "x",
      scale: 100,
      jitter: 50,
      minYear: 1000,
    });

    // The start handle is at year 1000. It is unique in datedNodes, so its y-coordinate is baseline (100).
    expect(positions["entity-1::primary-range-start"].x).toBe(0);
    expect(positions["entity-1::primary-range-start"].y).toBe(100);

    // The main node "entity-1" is not placed as a separate dated node (since start/end handles exist),
    // but its position is copied from the start handle "entity-1::primary-range-start".
    // So its y-coordinate is also exactly 100 (not jittered).
    expect(positions["entity-1"].x).toBe(0);
    expect(positions["entity-1"].y).toBe(100);

    // The end handle is at 1100.
    expect(positions["entity-1::primary-range-end"].x).toBe(140);
    expect(positions["entity-1::primary-range-end"].y).toBe(100);
  });
});

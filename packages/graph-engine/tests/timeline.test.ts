import { describe, it, expect } from "vitest";
import { getTimelineLayout } from "../src/layouts/timeline";
import type { GraphNode } from "../src/transformer";

describe("Timeline Layout", () => {
  const mockNodes: GraphNode[] = [
    {
      group: "nodes",
      data: { id: "n1", label: "Node 1", type: "npc", weight: 0, date: { year: 1000 } }
    },
    {
      group: "nodes",
      data: { id: "n2", label: "Node 2", type: "npc", weight: 0, date: { year: 1100 } }
    },
    {
      group: "nodes",
      data: { id: "n3", label: "Node 3", type: "npc", weight: 0, date: { year: 1000 } }
    }
  ];

  it("should calculate horizontal positions based on year", () => {
    const positions = getTimelineLayout(mockNodes, {
      axis: "x",
      scale: 10,
      jitter: 50,
      minYear: 1000
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
      minYear: 1000
    });

    // n1 and n3 both have year 1000
    // Secondary coords should be symmetric around 0
    expect(positions["n1"].y).toBe(-25);
    expect(positions["n3"].y).toBe(25);
  });

  it("should handle vertical orientation", () => {
    const positions = getTimelineLayout(mockNodes, {
      axis: "y",
      scale: 10,
      jitter: 50,
      minYear: 1000
    });

    expect(positions["n1"].y).toBe(0);
    expect(positions["n2"].y).toBe(14);
    expect(positions["n1"].x).toBe(-25);
  });
});

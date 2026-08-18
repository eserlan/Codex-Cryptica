import { describe, expect, it } from "vitest";
import {
  RING_CAPACITY_NARROW,
  RING_CAPACITY_WIDE,
  edgeSegment,
  layoutConnectionGraph,
  ringCapacity,
} from "./connections-graph";

/** Vertical half-height a card occupies, as a percentage of the container. */
const CARD_HALF_HEIGHT = 11;
/** The centre entity's circle and name, as a percentage of the container. */
const CENTRE_HALF_HEIGHT = 12;

describe("ringCapacity", () => {
  it("gives narrow containers fewer satellites, and more room each", () => {
    expect(ringCapacity(330)).toBe(RING_CAPACITY_NARROW);
    expect(ringCapacity(900)).toBe(RING_CAPACITY_WIDE);
    expect(RING_CAPACITY_NARROW).toBeLessThan(RING_CAPACITY_WIDE);
  });
});

describe("layoutConnectionGraph", () => {
  it("places nothing for an unconnected entity", () => {
    expect(layoutConnectionGraph(0)).toEqual([]);
  });

  it("puts a lone connection straight above the centre", () => {
    const [only] = layoutConnectionGraph(1);

    expect(only.x).toBe(50);
    expect(only.y).toBeLessThan(50);
  });

  it("splits the set between a top arc and a bottom arc", () => {
    const positions = layoutConnectionGraph(6);

    expect(positions.filter((p) => p.y < 50)).toHaveLength(3);
    expect(positions.filter((p) => p.y > 50)).toHaveLength(3);
  });

  // The first pass put satellites at 3 and 9 o'clock, so their relationship
  // labels landed on top of the centre entity. Nothing may sit in that band.
  it("keeps the centre's horizontal band clear at every size", () => {
    for (let count = 1; count <= RING_CAPACITY_WIDE; count++) {
      for (const position of layoutConnectionGraph(count)) {
        const clearance = Math.abs(position.y - 50);
        expect(
          clearance,
          `count ${count} put a node ${clearance}% from the centre band`,
        ).toBeGreaterThanOrEqual(CENTRE_HALF_HEIGHT + CARD_HALF_HEIGHT);
      }
    }
  });

  it("never lets two cards overlap", () => {
    for (let count = 1; count <= RING_CAPACITY_WIDE; count++) {
      const positions = layoutConnectionGraph(count);
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const a = positions[i];
          const b = positions[j];
          const verticallyApart =
            Math.abs(a.y - b.y) >= CARD_HALF_HEIGHT * 2 - 0.01;
          const horizontallyApart =
            Math.abs(a.x - b.x) >= (a.widthPct + b.widthPct) / 2 - 0.01;

          expect(
            verticallyApart || horizontallyApart,
            `count ${count}: cards ${i} and ${j} overlap`,
          ).toBe(true);
        }
      }
    }
  });

  it("keeps every card inside the container", () => {
    for (let count = 1; count <= RING_CAPACITY_WIDE; count++) {
      for (const p of layoutConnectionGraph(count)) {
        expect(p.x - p.widthPct / 2).toBeGreaterThanOrEqual(-0.01);
        expect(p.x + p.widthPct / 2).toBeLessThanOrEqual(100.01);
        expect(p.widthPct).toBeGreaterThan(0);
      }
    }
  });

  it("gives a sparse set more room per card than a crowded one", () => {
    const sparse = layoutConnectionGraph(3);
    const crowded = layoutConnectionGraph(RING_CAPACITY_WIDE);
    const narrowest = (ps: { widthPct: number }[]) =>
      Math.min(...ps.map((p) => p.widthPct));

    expect(narrowest(sparse)).toBeGreaterThan(narrowest(crowded));
  });
});

describe("edgeSegment", () => {
  it("draws only the middle of the spoke, clear of both ends", () => {
    const segment = edgeSegment({ x: 50, y: 12 });

    // Vertical spoke: stays on the centre line, starts below the centre
    // circle and stops short of the card.
    expect(segment.x1).toBe(50);
    expect(segment.x2).toBe(50);
    expect(segment.y1).toBeLessThan(50);
    expect(segment.y1).toBeGreaterThan(segment.y2);
    expect(segment.y2).toBeGreaterThan(12);
  });
});

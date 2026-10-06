import { describe, it, expect } from "vitest";
import {
  axialToCube,
  cubeToAxial,
  cubeRound,
  hexToPoint,
  pointToHex,
  getHexCorners,
  hexDistance,
  getHexNeighbors,
  getHexRange,
  getHexLine,
  snapPointToHexCenter,
  formatHexCoordinate,
  normalizeHexOffset,
  fitHexGrid,
  type HexCoord,
  type HexGridConfig,
} from "./hex";

describe("hex coordinate math", () => {
  it("converts axial coordinates to cube coordinates and back", () => {
    const axial: HexCoord = { q: 2, r: -3 };
    const cube = axialToCube(axial);
    expect(cube).toEqual({ x: 2, y: 1, z: -3 });
    expect(cube.x + cube.y + cube.z).toBe(0);

    const back = cubeToAxial(cube);
    expect(back).toEqual(axial);
  });

  it("correctly rounds fractional cube coordinates resolving rounding discrepancy", () => {
    // Fractional coordinate near (1, -2, 1)
    const rounded = cubeRound({ x: 0.9, y: -1.9, z: 1.0 });
    expect(rounded).toEqual({ x: 1, y: -2, z: 1 });
    expect(rounded.x + rounded.y + rounded.z).toBe(0);

    // Coordinate where simple Math.round would violate x + y + z = 0
    const edge = cubeRound({ x: 0.4, y: 0.4, z: -0.8 });
    expect(edge.x + edge.y + edge.z).toBe(0);
  });
});

describe("hex distance & neighbors", () => {
  it("computes distance between hex coordinates", () => {
    const origin: HexCoord = { q: 0, r: 0 };
    expect(hexDistance(origin, origin)).toBe(0);

    const neighbor: HexCoord = { q: 1, r: 0 };
    expect(hexDistance(origin, neighbor)).toBe(1);

    const distant: HexCoord = { q: 3, r: -2 };
    // cube: (3, -1, -2), distance from (0, 0, 0) is max(3, 1, 2) = 3
    expect(hexDistance(origin, distant)).toBe(3);
  });

  it("returns exactly 6 distinct neighbors at distance 1", () => {
    const center: HexCoord = { q: 2, r: 3 };
    const neighbors = getHexNeighbors(center);
    expect(neighbors).toHaveLength(6);

    for (const n of neighbors) {
      expect(hexDistance(center, n)).toBe(1);
    }

    const uniqueKeys = new Set(neighbors.map((n) => `${n.q},${n.r}`));
    expect(uniqueKeys.size).toBe(6);
  });

  it("computes hex range of radius N with 1 + 3N(N+1) cells", () => {
    const center: HexCoord = { q: 0, r: 0 };

    const r0 = getHexRange(center, 0);
    expect(r0).toEqual([{ q: 0, r: 0 }]);

    const r1 = getHexRange(center, 1);
    expect(r1).toHaveLength(7); // 1 + 3*1*2 = 7
    for (const hex of r1) {
      expect(hexDistance(center, hex)).toBeLessThanOrEqual(1);
    }

    const r2 = getHexRange(center, 2);
    expect(r2).toHaveLength(19); // 1 + 3*2*3 = 19
    for (const hex of r2) {
      expect(hexDistance(center, hex)).toBeLessThanOrEqual(2);
    }
  });

  it("draws a straight hex line between two coordinates", () => {
    const from: HexCoord = { q: 0, r: 0 };
    const to: HexCoord = { q: 4, r: -2 };
    const line = getHexLine(from, to);

    const dist = hexDistance(from, to);
    expect(line).toHaveLength(dist + 1);
    expect(line[0]).toEqual(from);
    expect(line[line.length - 1]).toEqual(to);

    // Each consecutive hex in line must be adjacent
    for (let i = 0; i < line.length - 1; i++) {
      expect(hexDistance(line[i], line[i + 1])).toBe(1);
    }
  });
});

describe("hex projection & conversion", () => {
  const pointyConfig: HexGridConfig = {
    orientation: "pointy",
    size: 50,
    offsetX: 10,
    offsetY: 20,
  };

  const flatConfig: HexGridConfig = {
    orientation: "flat",
    size: 60,
    offsetX: 0,
    offsetY: 0,
  };

  it("roundtrips hex center to point and back to hex for pointy orientation", () => {
    const hex: HexCoord = { q: 3, r: -2 };
    const center = hexToPoint(hex, pointyConfig);
    const converted = pointToHex(center, pointyConfig);
    expect(converted).toEqual(hex);
  });

  it("roundtrips hex center to point and back to hex for flat orientation", () => {
    const hex: HexCoord = { q: -4, r: 5 };
    const center = hexToPoint(hex, flatConfig);
    const converted = pointToHex(center, flatConfig);
    expect(converted).toEqual(hex);
  });

  it("snaps pixel coordinates within a hex to the hex center", () => {
    const hex: HexCoord = { q: 1, r: 1 };
    const center = hexToPoint(hex, pointyConfig);

    // Slightly offset point within the same cell
    const offsetPoint = { x: center.x + 5, y: center.y - 8 };
    const snapped = snapPointToHexCenter(offsetPoint, pointyConfig);
    expect(snapped.x).toBeCloseTo(center.x, 3);
    expect(snapped.y).toBeCloseTo(center.y, 3);
  });

  it("generates 6 polygon corner vertices for a hex", () => {
    const center = { x: 100, y: 100 };
    const corners = getHexCorners(center, 50, "pointy");
    expect(corners).toHaveLength(6);

    for (const corner of corners) {
      const dx = corner.x - center.x;
      const dy = corner.y - center.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      expect(dist).toBeCloseTo(50, 3);
    }
  });

  it("formats hex coordinates with padded digits", () => {
    expect(formatHexCoordinate({ q: 1, r: 4 })).toBe("01.04");
    expect(formatHexCoordinate({ q: 12, r: 3 })).toBe("12.03");
    expect(formatHexCoordinate({ q: -2, r: 5 })).toBe("-02.05");
  });
});

describe("hex grid fitting", () => {
  const SQRT_3 = Math.sqrt(3);

  /** Drag across `span` hexes of a known grid, as a user would. */
  function dragAcross(
    config: HexGridConfig,
    span: number,
    from: HexCoord = { q: 0, r: 0 },
  ) {
    const first = hexToPoint(from, config);
    const w = (SQRT_3 / 2) * config.size;
    if (config.orientation === "pointy") {
      // along a row: step in q
      const last = hexToPoint({ q: from.q + span - 1, r: from.r }, config);
      return {
        start: { x: first.x - w, y: first.y - 5 },
        end: { x: last.x + w, y: first.y + 5 },
      };
    }
    // flat-top: down a column, step in r
    const last = hexToPoint({ q: from.q, r: from.r + span - 1 }, config);
    return {
      start: { x: first.x - 5, y: first.y - w },
      end: { x: first.x + 5, y: last.y + w },
    };
  }

  it.each(["pointy", "flat"] as const)(
    "recovers the size and alignment of a %s grid",
    (orientation) => {
      const truth: HexGridConfig = {
        orientation,
        size: 41.5,
        offsetX: 17,
        offsetY: -9,
      };
      const drag = dragAcross(truth, 4, { q: 2, r: 3 });

      const fit = fitHexGrid({ ...drag, span: 4, orientation });

      expect(fit.size).toBeCloseTo(41.5, 5);
      // Same grid: every hex centre of the truth lands on a centre of the fit.
      const fitted: HexGridConfig = {
        orientation,
        size: fit.size,
        offsetX: fit.offsetX,
        offsetY: fit.offsetY,
      };
      for (const hex of [
        { q: 0, r: 0 },
        { q: 5, r: -3 },
        { q: -4, r: 7 },
      ]) {
        const centre = hexToPoint(hex, truth);
        const snapped = hexToPoint(pointToHex(centre, fitted), fitted);
        expect(snapped.x).toBeCloseTo(centre.x, 4);
        expect(snapped.y).toBeCloseTo(centre.y, 4);
      }
    },
  );

  it("gives the same size whichever way the drag was made", () => {
    const config: HexGridConfig = {
      orientation: "pointy",
      size: 30,
      offsetX: 0,
      offsetY: 0,
    };
    const { start, end } = dragAcross(config, 3);

    const forward = fitHexGrid({ start, end, span: 3, orientation: "pointy" });
    const backward = fitHexGrid({
      start: end,
      end: start,
      span: 3,
      orientation: "pointy",
    });

    expect(backward.size).toBeCloseTo(forward.size, 8);
    expect(backward.offsetX).toBeCloseTo(forward.offsetX, 8);
    expect(backward.offsetY).toBeCloseTo(forward.offsetY, 8);
  });

  it("scales with the span, and treats a span below 1 as 1", () => {
    const start = { x: 0, y: 0 };
    const end = { x: SQRT_3 * 20 * 2, y: 0 };

    expect(
      fitHexGrid({ start, end, span: 2, orientation: "pointy" }).size,
    ).toBeCloseTo(20, 8);
    expect(
      fitHexGrid({ start, end, span: 0, orientation: "pointy" }).size,
    ).toBeCloseTo(40, 8);
  });

  it("returns a zero size for a drag with no length along the row", () => {
    const fit = fitHexGrid({
      start: { x: 10, y: 10 },
      end: { x: 10, y: 80 },
      span: 3,
      orientation: "pointy",
    });

    expect(fit.size).toBe(0);
  });

  it("keeps offsets small without changing the grid", () => {
    const config: HexGridConfig = {
      orientation: "pointy",
      size: 25,
      offsetX: 0,
      offsetY: 0,
    };
    const far = hexToPoint({ q: 40, r: -22 }, config);
    const near = normalizeHexOffset(far, 25, "pointy");

    expect(Math.abs(near.x)).toBeLessThanOrEqual(25 * SQRT_3);
    expect(Math.abs(near.y)).toBeLessThanOrEqual(25 * 1.5);
    const nearConfig = { ...config, offsetX: near.x, offsetY: near.y };
    const farConfig = { ...config, offsetX: far.x, offsetY: far.y };
    // Every centre of the original grid is a centre of the reduced one.
    for (const hex of [
      { q: 0, r: 0 },
      { q: 3, r: -2 },
      { q: -6, r: 9 },
    ]) {
      const centre = hexToPoint(hex, farConfig);
      const onNear = hexToPoint(pointToHex(centre, nearConfig), nearConfig);
      expect(onNear.x).toBeCloseTo(centre.x, 6);
      expect(onNear.y).toBeCloseTo(centre.y, 6);
    }
  });
});

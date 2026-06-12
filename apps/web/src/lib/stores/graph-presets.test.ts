import { describe, it, expect } from "vitest";
import { parsePresets, presetsSettingsKey } from "./graph-presets";

const validState = {
  activeLabels: ["quest-arc"],
  labelFilterMode: "AND",
  activeCategories: ["person"],
  showLabels: true,
  showImages: false,
  stableLayout: true,
  timelineMode: false,
  timelineAxis: "x",
  timelineRange: { start: null, end: null },
  timelineScale: 100,
  orbitMode: false,
  centralNodeId: null,
  viewport: { pan: { x: 10, y: -20 }, zoom: 1.5 },
};

const validPreset = {
  id: "p1",
  name: "Quest Arc",
  createdAt: 1000,
  updatedAt: 2000,
  state: validState,
};

describe("presetsSettingsKey", () => {
  it("scopes the settings key per vault", () => {
    expect(presetsSettingsKey("vault-a")).toBe("graphViewPresets:vault-a");
  });
});

describe("parsePresets", () => {
  it("round-trips a valid preset", () => {
    const [p] = parsePresets([validPreset]);
    expect(p).toEqual(validPreset);
  });

  it("returns empty for non-array input", () => {
    expect(parsePresets(undefined)).toEqual([]);
    expect(parsePresets(null)).toEqual([]);
    expect(parsePresets("junk")).toEqual([]);
    expect(parsePresets({})).toEqual([]);
  });

  it("drops malformed entries but keeps valid ones", () => {
    const parsed = parsePresets([
      null,
      "garbage",
      { id: "", name: "no id", state: validState },
      { id: "p2", name: "   ", state: validState },
      { id: "p3", name: "no state" },
      {
        id: "p4",
        name: "bad labels",
        state: { ...validState, activeLabels: "x" },
      },
      validPreset,
    ]);
    expect(parsed.map((p) => p.id)).toEqual(["p1"]);
  });

  it("normalizes invalid enum and numeric fields to safe defaults", () => {
    const [p] = parsePresets([
      {
        id: "p5",
        name: "odd",
        state: {
          ...validState,
          labelFilterMode: "XOR",
          timelineAxis: "z",
          timelineScale: "wide",
          timelineRange: { start: "then", end: 50 },
          centralNodeId: 42,
        },
      },
    ]);
    expect(p.state.labelFilterMode).toBe("OR");
    expect(p.state.timelineAxis).toBe("x");
    expect(p.state.timelineScale).toBe(100);
    expect(p.state.timelineRange).toEqual({ start: null, end: 50 });
    expect(p.state.centralNodeId).toBeNull();
  });

  it("drops a corrupt viewport instead of the whole preset", () => {
    const [p] = parsePresets([
      {
        ...validPreset,
        state: { ...validState, viewport: { pan: { x: NaN, y: 0 }, zoom: 1 } },
      },
    ]);
    expect(p.state.viewport).toBeUndefined();
  });

  it("fills missing timestamps", () => {
    const [p] = parsePresets([{ id: "p6", name: "old", state: validState }]);
    expect(p.createdAt).toBeGreaterThan(0);
    expect(p.updatedAt).toBeGreaterThan(0);
  });

  it("keeps createdAt <= updatedAt when only one timestamp is present", () => {
    const [a] = parsePresets([
      { id: "p7", name: "a", updatedAt: 5000, state: validState },
    ]);
    expect(a.createdAt).toBe(5000);
    expect(a.updatedAt).toBe(5000);

    const [b] = parsePresets([
      { id: "p8", name: "b", createdAt: 3000, state: validState },
    ]);
    expect(b.createdAt).toBe(3000);
    expect(b.updatedAt).toBe(3000);
  });

  it("trims whitespace from persisted names", () => {
    const [p] = parsePresets([{ ...validPreset, name: "  Padded Name  " }]);
    expect(p.name).toBe("Padded Name");
  });
});

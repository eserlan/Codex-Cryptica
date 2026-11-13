import { describe, expect, it } from "vitest";
import {
  captureViewState,
  pushRecentLabel,
  resolveAvailableFilters,
  resolvePresetView,
  type ViewStateSource,
} from "./graph-view-state";

const preset = (overrides: Record<string, unknown> = {}) =>
  ({
    activeLabels: [],
    labelFilterMode: "OR",
    activeCategories: [],
    ...overrides,
  }) as any;

const entities = [
  { id: "a", type: "npc", labels: ["Magic"] },
  { id: "b", type: "place", labels: [] },
] as any[];

describe("pushRecentLabel", () => {
  it("moves a repeated label to the front without duplicating it", () => {
    expect(pushRecentLabel(["a", "b", "c"], "c")).toEqual(["c", "a", "b"]);
  });

  it("keeps only the five most recent", () => {
    expect(pushRecentLabel(["1", "2", "3", "4", "5"], "6")).toEqual([
      "6",
      "1",
      "2",
      "3",
      "4",
    ]);
  });
});

describe("captureViewState", () => {
  const source: ViewStateSource = {
    activeLabels: new Set(["magic"]),
    labelFilterMode: "AND",
    activeCategories: new Set(["npc"]),
    showLabels: true,
    showImages: false,
    stableLayout: true,
    timelineMode: false,
    timelineAxis: "y",
    timelineRange: { start: 1, end: 9 },
    timelineScale: 50,
    orbitMode: true,
    centralNodeId: "a",
  };

  it("records the filters and display state as plain data", () => {
    const state = captureViewState(source, { pan: { x: 1, y: 2 }, zoom: 3 });

    expect(state.activeLabels).toEqual(["magic"]);
    expect(state.activeCategories).toEqual(["npc"]);
    expect(state.timelineRange).toEqual({ start: 1, end: 9 });
    expect(state.timelineRange).not.toBe(source.timelineRange);
    expect(state.viewport).toEqual({ pan: { x: 1, y: 2 }, zoom: 3 });
  });

  it("leaves the layout key out unless one was chosen", () => {
    expect("layout" in captureViewState(source)).toBe(false);
    const layout = { positions: {} } as any;
    expect(captureViewState(source, undefined, layout).layout).toBe(layout);
  });
});

describe("resolveAvailableFilters", () => {
  it("drops labels, categories and an orbit centre the vault no longer has", () => {
    const result = resolveAvailableFilters(
      preset({
        activeLabels: ["magic", "gone"],
        activeCategories: ["npc", "ghost"],
        centralNodeId: "zzz",
      }),
      entities,
    );
    expect(result).toEqual({
      labels: ["magic"],
      categories: ["npc"],
      centralNodeId: null,
    });
  });

  it("matches labels regardless of case", () => {
    expect(
      resolveAvailableFilters(preset({ activeLabels: ["MAGIC"] }), entities)
        .labels,
    ).toEqual(["MAGIC"]);
  });

  it("keeps everything while the vault is still empty", () => {
    const result = resolveAvailableFilters(
      preset({ activeLabels: ["x"], centralNodeId: "q" }),
      [],
    );
    expect(result).toEqual({
      labels: ["x"],
      categories: [],
      centralNodeId: "q",
    });
  });
});

describe("resolvePresetView", () => {
  it("falls back to defaults for a view saved before these options existed", () => {
    const view = resolvePresetView(preset(), entities);

    expect(view).toMatchObject({
      showLabels: true,
      showImages: true,
      stableLayout: true,
      timelineAxis: "x",
      timelineRange: { start: null, end: null },
      timelineScale: 100,
      timelineMode: false,
      orbitMode: false,
      centralNodeId: null,
    });
  });

  it("turns orbit on only when its centre still exists", () => {
    const kept = resolvePresetView(
      preset({ orbitMode: true, centralNodeId: "a" }),
      entities,
    );
    const dropped = resolvePresetView(
      preset({ orbitMode: true, centralNodeId: "zzz" }),
      entities,
    );

    expect(kept.orbitMode).toBe(true);
    expect(kept.centralNodeId).toBe("a");
    expect(dropped.orbitMode).toBe(false);
    expect(dropped.centralNodeId).toBeNull();
  });
});

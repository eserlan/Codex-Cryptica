import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncGraphElements } from "graph-engine";
import { GraphViewSync } from "./graph-view-sync";
import { GraphRenderActivity } from "./graph-visibility";
import type { GraphViewMeasurements } from "./graph-view-measurements";
import type { GraphViewDependencies, GraphViewHost } from "./graph-view-types";

vi.mock("graph-engine", () => ({ syncGraphElements: vi.fn() }));

describe("GraphViewSync", () => {
  beforeEach(() => vi.clearAllMocks());

  function setup() {
    const host = {
      cy: {},
      isSuspended: false,
      loadPhase: "ready",
      applyCurrentLayout: vi.fn(),
    } as unknown as GraphViewHost;
    const vault = { graphStructureVersion: 0, status: "idle", entities: {} };
    const deps = {
      graph: {
        elements: [],
        focusDepth: 1,
        focusRootId: "first",
        focusViewActive: true,
        activeLabels: new Set(),
        activeCategories: new Set(),
        labelFilterMode: "OR",
        perfStylingActive: true,
      },
      vault,
    } as unknown as GraphViewDependencies;
    const measurements = {
      startFocusDepthMeasurement: vi.fn(),
      scheduleRenderReadyMeasurement: vi.fn(),
    } as unknown as GraphViewMeasurements;
    const activity = new GraphRenderActivity(host);
    const sync = new GraphViewSync(host, deps, activity, measurements);
    const options = () => vi.mocked(syncGraphElements).mock.calls.at(-1)![1];
    return { sync, host, deps, activity, measurements, options, vault };
  }

  it("treats depth changes as membership-only updates and preserves the camera", () => {
    const { sync, deps, host, measurements, options } = setup();
    sync.syncElements();
    deps.graph.focusDepth = 2;
    sync.syncElements();
    expect(options().focusMembershipOnly).toBe(true);
    expect(options().skipRenderedWeightSync).toBe(true);
    options().onLayoutUpdate!({ reason: "Elements Update" });
    expect(host.applyCurrentLayout).toHaveBeenCalledWith({
      reason: "Elements Update",
      viewport: "preserve",
    });
    expect(measurements.startFocusDepthMeasurement).toHaveBeenCalledOnce();
    expect(measurements.scheduleRenderReadyMeasurement).toHaveBeenCalledTimes(
      2,
    );
    options().onFirstElements!();
    expect(host.loadPhase).toBe("elements");
  });

  it("keeps entity and filter edits on the full synchronization path", () => {
    const { sync, deps, vault, options } = setup();
    sync.syncElements();
    deps.graph.focusDepth = 2;
    vault.graphStructureVersion++;
    sync.syncElements();
    expect(options().focusMembershipOnly).toBe(false);
    deps.graph.focusDepth = 3;
    deps.graph.activeLabels.add("important");
    sync.syncElements();
    expect(options().focusMembershipOnly).toBe(false);
    expect(options().skipRenderedWeightSync).toBe(false);
  });

  it("ignores obsolete callbacks and defers suspended work", () => {
    const { sync, host, activity, options } = setup();
    sync.syncElements();
    const stale = options().onLayoutUpdate!;
    sync.syncElements();
    stale({ reason: "Elements Update" });
    expect(host.applyCurrentLayout).not.toHaveBeenCalled();
    const current = options().onLayoutUpdate!;
    activity.generation++;
    current({ reason: "Elements Update" });
    expect(host.applyCurrentLayout).not.toHaveBeenCalled();
    host.isSuspended = true;
    sync.syncElements();
    expect(syncGraphElements).toHaveBeenCalledTimes(2);
    expect(activity.needsReconcile).toBe(true);
  });
});

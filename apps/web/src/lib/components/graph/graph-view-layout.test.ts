import { afterEach, describe, expect, it, vi } from "vitest";
import type { LayoutOptions } from "graph-engine";
import { GraphViewLayout, resolveViewport } from "./graph-view-layout";
import { GraphRenderActivity } from "./graph-visibility";
import { GraphViewMeasurements } from "./graph-view-measurements";
import type { GraphViewLoadState } from "./graph-view-load-state";
import type { GraphViewDependencies, GraphViewHost } from "./graph-view-types";

describe("GraphViewLayout", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function setup() {
    const apply = vi.fn().mockResolvedValue(undefined);
    const cy = {
      zoom: vi.fn(() => 1),
      destroyed: () => false,
      nodes: () => ({ length: 1 }),
      edges: () => ({ length: 0 }),
      resize: vi.fn(),
      width: vi.fn(() => 200),
      height: () => 100,
    };
    const host = {
      cy,
      layoutManager: { apply },
      loadPhase: "elements",
      isSuspended: false,
      isLayoutRunning: false,
      applyCurrentLayout: vi.fn(),
    } as unknown as GraphViewHost;
    const deps = {
      graph: {
        stableLayout: true,
        stats: { nodeCount: 1 },
        focusDepth: 1,
        focusViewActive: true,
      },
      vault: { status: "idle", entities: { first: {} }, batchUpdate: vi.fn() },
      layoutUIStore: {},
      debugStore: { log: vi.fn() },
    } as unknown as GraphViewDependencies;
    const activity = new GraphRenderActivity(host);
    const measurements = new GraphViewMeasurements(host, deps.graph);
    const load = { savedCoordsDegenerate: false } as GraphViewLoadState;
    const layout = new GraphViewLayout(
      host,
      deps,
      activity,
      measurements,
      load,
    );
    const options = () => apply.mock.calls.at(-1)![1] as LayoutOptions;
    return { layout, host, cy, deps, activity, apply, options };
  }

  it("runs initial-layout callbacks and persists missing coordinates", async () => {
    const { layout, host, deps, options } = setup();
    await layout.applyCurrentLayout({ reason: "Initial", isInitial: true });
    options().onLayoutStart!();
    expect(host.isLayoutRunning).toBe(true);
    options().onLayoutStop!();
    expect(host.loadPhase).toBe("ready");
    expect(host.isLayoutRunning).toBe(false);
    const updates = { first: { metadata: { coordinates: { x: 4, y: 5 } } } };
    options().onPositionsUpdated!(updates);
    expect(deps.vault.batchUpdate).toHaveBeenCalledWith(updates);
    layout.clearTimers();
  });

  it("rejects stale layout and position callbacks after visibility changes", async () => {
    const { layout, activity, host, deps, options } = setup();
    await layout.applyCurrentLayout({ reason: "Initial", isInitial: true });
    activity.generation++;
    options().onLayoutStart!();
    options().onLayoutStop!();
    options().onPositionsUpdated!({});
    expect(host.isLayoutRunning).toBe(false);
    expect(host.loadPhase).toBe("elements");
    expect(deps.vault.batchUpdate).not.toHaveBeenCalled();
    expect(activity.needsReconcile).toBe(true);
  });

  it("propagates layout failures and skips suspended work", async () => {
    const { layout, host, apply } = setup();
    apply.mockRejectedValueOnce(new Error("layout failed"));
    await expect(
      layout.applyCurrentLayout({ reason: "Redraw" }),
    ).rejects.toThrow("layout failed");
    host.isSuspended = true;
    await layout.applyCurrentLayout({ reason: "Redraw" });
    expect(apply).toHaveBeenCalledOnce();
  });

  it("debounces resize, fits on orientation changes and cancels pending resizes", () => {
    vi.useFakeTimers();
    const { layout, host, cy } = setup();
    layout.handleResize();
    layout.handleResize();
    vi.advanceTimersByTime(250);
    expect(host.applyCurrentLayout).toHaveBeenLastCalledWith({
      reason: "Window Resize",
    });
    cy.width.mockReturnValue(50);
    layout.handleResize();
    vi.advanceTimersByTime(250);
    expect(host.applyCurrentLayout).toHaveBeenLastCalledWith({
      reason: "Window Resize",
      isForced: true,
      reseed: true,
    });
    layout.handleResize();
    layout.clearTimers();
    vi.advanceTimersByTime(250);
    expect(cy.resize).toHaveBeenCalledTimes(2);
  });

  it("changes focus depth only after user zoom settles and stops after cancellation", () => {
    vi.useFakeTimers();
    const { layout, cy, deps } = setup();
    layout.handleFocusZoom();
    vi.advanceTimersByTime(150);
    cy.zoom.mockReturnValue(2);
    layout.handleFocusZoom();
    vi.advanceTimersByTime(150);
    expect(deps.graph.focusDepth).toBe(2);
    cy.zoom.mockReturnValue(4);
    layout.handleFocusZoom();
    layout.clearTimers();
    vi.advanceTimersByTime(150);
    expect(deps.graph.focusDepth).toBe(2);
    expect(
      resolveViewport(false, "Window Resize", false, false, false, true),
    ).toBe("preserve");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { GraphViewLoadState } from "./graph-view-load-state";
import { GraphRenderActivity } from "./graph-visibility";
import type { GraphViewDependencies, GraphViewHost } from "./graph-view-types";

describe("GraphViewLoadState", () => {
  afterEach(() => vi.useRealTimers());

  function setup() {
    const destroy = vi.fn();
    const host = {
      cy: { nodes: () => ({ length: 5 }), destroyed: () => false },
      imageManager: { destroy },
      loadPhase: "elements",
      isSuspended: false,
      applyCurrentLayout: vi.fn(),
    } as unknown as GraphViewHost;
    const vault = {
      activeVaultId: undefined as string | undefined,
      status: "idle",
      allEntities: [],
      releaseThumbnailUrl: vi.fn(),
    };
    const deps = {
      vault,
      debugStore: { log: vi.fn() },
    } as unknown as GraphViewDependencies;
    const state = new GraphViewLoadState(
      host,
      deps,
      new GraphRenderActivity(host),
    );
    return { state, host, deps, destroy, vault };
  }

  it("finalizes a load and resets on vault switches", () => {
    const { state, host, vault, destroy } = setup();
    state.reconcile();
    expect(host.loadPhase).toBe("finalized");
    expect(host.applyCurrentLayout).toHaveBeenCalledWith({
      reason: "Load Finalized",
      isInitial: true,
      isForced: true,
    });
    vault.activeVaultId = "another-vault";
    state.reconcile();
    expect(host.loadPhase).toBe("idle");
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("schedules one recovery for degenerate coordinates and cancels pending recovery", () => {
    vi.useFakeTimers();
    const { state, host } = setup();
    host.loadPhase = "ready";
    state.savedCoordsDegenerate = true;
    state.reconcile();
    vi.advanceTimersByTime(1500);
    expect(host.applyCurrentLayout).toHaveBeenCalledWith({
      reason: "Slash Recovery",
      isInitial: true,
      isForced: true,
      reseed: true,
    });
    state.reconcile();
    vi.advanceTimersByTime(1500);
    expect(host.applyCurrentLayout).toHaveBeenCalledOnce();

    const next = setup();
    next.host.loadPhase = "ready";
    next.state.savedCoordsDegenerate = true;
    next.state.reconcile();
    next.state.clearTimer();
    vi.advanceTimersByTime(1500);
    expect(next.host.applyCurrentLayout).not.toHaveBeenCalled();
  });

  it("does not finalize while suspended or recover while the vault is loading", () => {
    vi.useFakeTimers();
    const { state, host, deps } = setup();
    host.isSuspended = true;
    state.reconcile();
    expect(host.loadPhase).toBe("elements");
    host.isSuspended = false;
    host.loadPhase = "ready";
    state.savedCoordsDegenerate = true;
    state.reconcile();
    deps.vault.status = "loading";
    vi.advanceTimersByTime(1500);
    expect(host.applyCurrentLayout).not.toHaveBeenCalled();
  });
});

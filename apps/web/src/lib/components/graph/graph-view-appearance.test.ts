import { beforeEach, describe, expect, it, vi } from "vitest";
import { attachCommunityHulls, applyLargeGraphRenderHints } from "graph-engine";
import { GraphViewAppearance } from "./graph-view-appearance";
import { GraphRenderActivity } from "./graph-visibility";
import { syncGraphImages } from "./graph-image-sync";
import type { GraphViewDependencies, GraphViewHost } from "./graph-view-types";

const overlay = vi.hoisted(() => ({
  destroy: vi.fn(),
  setEnabled: vi.fn(),
  setStrong: vi.fn(),
}));
vi.mock("graph-engine", () => ({
  attachCommunityHulls: vi.fn(() => overlay),
  applyLargeGraphRenderHints: vi.fn(),
}));
vi.mock("./graph-image-sync", () => ({ syncGraphImages: vi.fn() }));

describe("GraphViewAppearance", () => {
  beforeEach(() => vi.clearAllMocks());

  function setup() {
    const host = {
      cy: {},
      imageManager: {},
      isSuspended: false,
      communityHulls: undefined,
    } as unknown as GraphViewHost;
    const deps = {
      graph: {
        elements: [],
        communityMode: "strong",
        timelineMode: false,
        orbitMode: false,
        isLargeGraph: true,
      },
      vault: {},
      debugStore: {},
    } as unknown as GraphViewDependencies;
    const appearance = new GraphViewAppearance(
      host,
      deps,
      new GraphRenderActivity(host),
    );
    return { appearance, host, deps };
  }

  it("attaches community hulls and updates their mode before releasing the overlay", () => {
    const { appearance, host, deps } = setup();
    const container = document.createElement("div");
    const canvas = document.createElement("canvas");
    canvas.dataset.communityHulls = "";
    container.appendChild(canvas);
    appearance.attachHulls(host.cy!, container);
    expect(attachCommunityHulls).toHaveBeenCalledWith(host.cy, canvas, {
      enabled: true,
      strong: true,
    });
    appearance.syncCommunityHulls();
    expect(overlay.setEnabled).toHaveBeenLastCalledWith(true);
    expect(overlay.setStrong).toHaveBeenLastCalledWith(true);
    deps.graph.timelineMode = true;
    appearance.syncCommunityHulls();
    expect(overlay.setEnabled).toHaveBeenLastCalledWith(false);
    appearance.destroyHulls();
    expect(overlay.destroy).toHaveBeenCalledOnce();
    expect(host.communityHulls).toBeUndefined();
  });

  it("applies render and image policy only while the graph is active", () => {
    const { appearance, host, deps } = setup();
    appearance.syncRenderHints();
    appearance.syncImages();
    expect(applyLargeGraphRenderHints).toHaveBeenCalledWith(host.cy, true);
    expect(syncGraphImages).toHaveBeenCalledWith(
      expect.objectContaining({
        graph: deps.graph,
        vault: deps.vault,
        imageManager: host.imageManager,
      }),
    );
    host.isSuspended = true;
    appearance.syncRenderHints();
    appearance.syncImages();
    expect(applyLargeGraphRenderHints).toHaveBeenCalledOnce();
    expect(syncGraphImages).toHaveBeenCalledOnce();
  });

  it("releases an old overlay when its canvas is absent and skips unavailable image managers", () => {
    const { appearance, host } = setup();
    host.communityHulls = overlay;
    appearance.attachHulls(host.cy!, document.createElement("div"));
    expect(overlay.destroy).toHaveBeenCalledOnce();
    expect(host.communityHulls).toBeUndefined();
    expect(attachCommunityHulls).not.toHaveBeenCalled();
    host.imageManager = undefined;
    appearance.syncImages();
    expect(syncGraphImages).not.toHaveBeenCalled();
  });
});

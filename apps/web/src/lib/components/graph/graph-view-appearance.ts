import { untrack } from "svelte";
import { attachCommunityHulls, applyLargeGraphRenderHints } from "graph-engine";
import type { Core } from "cytoscape";
import { themeStore } from "$lib/stores/theme.svelte";
import { categories } from "$lib/stores/categories.svelte";
import { syncGraphImages } from "./graph-image-sync";
import type { GraphRenderActivity } from "./graph-visibility";
import type { GraphViewDependencies, GraphViewHost } from "./graph-view-types";

/** Applies image, performance-style and community-overlay presentation policy. */
export class GraphViewAppearance {
  constructor(
    private host: GraphViewHost,
    private deps: GraphViewDependencies,
    private activity: GraphRenderActivity,
  ) {}

  attachHulls(cy: Core, container: HTMLElement) {
    const hullCanvas = container.querySelector<HTMLCanvasElement>(
      "canvas[data-community-hulls]",
    );
    this.host.communityHulls?.destroy();
    this.host.communityHulls = hullCanvas
      ? attachCommunityHulls(cy, hullCanvas, {
          enabled: untrack(() => this.communityHullsWanted()),
          strong: untrack(() => this.deps.graph.communityMode === "strong"),
        })
      : undefined;
  }

  destroyHulls() {
    this.host.communityHulls?.destroy();
    this.host.communityHulls = undefined;
  }

  /**
   * Re-applies the renderer-level large-graph hints (hideEdgesOnViewport,
   * motionBlur) whenever the graph crosses the perf-mode threshold. cy is
   * constructed while the vault is still empty, so these can't be set correctly
   * at init time — they have to be patched onto the live renderer once entities
   * have streamed in and `isLargeGraph` settles.
   */
  syncRenderHints = () => {
    if (this.activity.deferWhileSuspended()) return;
    if (this.host.cy) {
      applyLargeGraphRenderHints(this.host.cy, this.deps.graph.isLargeGraph);
    }
  };

  /** Timeline and orbit arrange nodes by date or distance, not by community. */
  private communityHullsWanted() {
    const g = this.deps.graph;
    return g.communityMode !== "off" && !g.timelineMode && !g.orbitMode;
  }

  syncCommunityHulls = () => {
    this.host.communityHulls?.setEnabled(this.communityHullsWanted());
    this.host.communityHulls?.setStrong(
      this.deps.graph.communityMode === "strong",
    );
  };

  syncImages = () => {
    if (this.activity.deferWhileSuspended()) return;
    if (this.host.cy && this.deps.graph.elements && this.host.imageManager) {
      untrack(() => {
        syncGraphImages({
          imageManager: this.host.imageManager!,
          graph: this.deps.graph,
          vault: this.deps.vault,
          debugStore: this.deps.debugStore,
          activeTheme: themeStore.activeTheme,
          categoryList: categories.list,
        });
      });
    }
  };
}

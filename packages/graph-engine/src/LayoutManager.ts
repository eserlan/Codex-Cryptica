import type { Core } from "cytoscape";
import type { Entity } from "schema";
import {
  getDynamicLayoutOptions,
  getTimelineLayout,
  setCentralNode,
  hasTimelineDate,
  type GraphNode,
} from "./index";

export interface LayoutOptions {
  timelineMode: boolean;
  timelineAxis: "x" | "y";
  timelineScale: number;
  orbitMode: boolean;
  centralNodeId: string | null;
  stableLayout: boolean;
  isGuest: boolean;
  onLayoutStart?: () => void;
  onLayoutStop?: () => void;
  onPositionsUpdated?: (updates: Record<string, any>) => void;
}

export class LayoutManager {
  private currentLayout: any;

  constructor(private cy: Core) {}

  async apply(
    options: LayoutOptions,
    isInitial = false,
    isForced = false,
    caller = "unknown",
  ) {
    if (!this.cy || this.cy.destroyed()) return;

    if (this.currentLayout) {
      try {
        this.currentLayout.stop();
      } catch {
        /* ignore */
      }
    }

    options.onLayoutStart?.();

    try {
      this.cy.resize();

      // Handle visibility classes
      this.cy.batch(() => {
        this.cy.nodes().forEach((node) => {
          const data = node.data() as GraphNode["data"];
          const hasDate = hasTimelineDate({ group: "nodes", data });
          if (options.timelineMode && !hasDate) {
            node.addClass("timeline-hidden");
          } else {
            node.removeClass("timeline-hidden");
          }
        });
      });

      if (options.isGuest) {
        if (isInitial) {
          this.cy.fit(this.cy.nodes(), 20);
        }
        options.onLayoutStop?.();
        return;
      }

      if (options.timelineMode) {
        await this.applyTimelineLayout(options);
      } else if (options.orbitMode && options.centralNodeId) {
        await this.applyOrbitLayout(options, isInitial);
      } else {
        await this.applyForceLayout(options, isInitial, isForced, caller);
      }
    } catch (error) {
      console.error("[LayoutManager] Unexpected error in apply", error);
      options.onLayoutStop?.();
    }
  }

  private async applyTimelineLayout(options: LayoutOptions) {
    try {
      const nodes = this.cy
        .nodes()
        .map((n) => ({ group: "nodes", data: n.data() })) as any[];
      const positions = getTimelineLayout(nodes, {
        axis: options.timelineAxis,
        scale: options.timelineScale,
        jitter: 150,
      });

      const nodesToLayout = this.cy
        .nodes()
        .filter((n) => positions[n.id()] !== undefined);

      nodesToLayout
        .layout({
          name: "preset",
          positions: positions,
          animate: true,
          animationDuration: 500,
          animationEasing: "ease-out-cubic",
          fit: true,
          padding: 20,
          stop: () => options.onLayoutStop?.(),
        } as any)
        .run();
    } catch (err) {
      console.error("[LayoutManager] Timeline layout failed", err);
      options.onLayoutStop?.();
    }
  }

  private async applyOrbitLayout(options: LayoutOptions, isInitial: boolean) {
    setCentralNode(this.cy, options.centralNodeId!);
    if (isInitial) {
      this.cy.resize();
      this.cy.animate({
        fit: { eles: this.cy.nodes(), padding: 20 },
        duration: 800,
        easing: "ease-out-cubic",
        complete: () => options.onLayoutStop?.(),
      });
    } else {
      options.onLayoutStop?.();
    }
  }

  private async applyForceLayout(
    options: LayoutOptions,
    isInitial: boolean,
    isForced: boolean,
    caller: string,
  ) {
    const cyNodes = this.cy.nodes();

    // Check for nodes without positions
    cyNodes.forEach((n) => {
      if (!n.position() || (n.position().x === 0 && n.position().y === 0)) {
        // We consider 0,0 potentially new or clumped
      }
    });

    const isExitingTimeline =
      caller === "Timeline Toggle" && !options.timelineMode;
    let randomize = isExitingTimeline;

    // Clump detection
    if (!randomize && cyNodes.length > 1) {
      let nodesAtOrigin = 0;
      cyNodes.forEach((n) => {
        const p = n.position();
        if (p.x === 0 && p.y === 0) nodesAtOrigin++;
      });
      if (nodesAtOrigin === cyNodes.length) {
        randomize = true;
      }
    }

    if (options.stableLayout && !isForced && !isExitingTimeline && !randomize) {
      if (isInitial || caller === "Load Finalized") {
        this.cy.resize();
        this.cy.animate({
          fit: { eles: this.cy.elements(), padding: 20 },
          duration: 800,
          easing: "ease-out-cubic",
          complete: () => options.onLayoutStop?.(),
        });
      } else {
        options.onLayoutStop?.();
      }
      return;
    }

    const width = this.cy.width();
    const height = this.cy.height();
    const ar = width / height;
    const isLandscape = ar > 1.2;

    this.currentLayout = this.cy.layout({
      ...getDynamicLayoutOptions(cyNodes.length),
      boundingBox: { x1: -2000, y1: -2000, x2: 2000, y2: 2000 },
      gravity: isLandscape ? 0.1 : 0.8,
      randomize,
      animate: false,
      fit: false,
    } as any);

    const layout = this.currentLayout;
    layout.one("layoutstop", () => {
      if (this.currentLayout !== layout || this.cy.destroyed()) return;

      this.cy.resize();
      this.cy.animate({
        fit: { eles: this.cy.elements(), padding: 20 },
        duration: 800,
        easing: "ease-out-quad",
        complete: () => options.onLayoutStop?.(),
      });

      // Position persistence
      if (!options.isGuest) {
        const updates: Record<string, Partial<Entity>> = {};
        this.cy.nodes().forEach((node) => {
          const pos = node.position();
          updates[node.id()] = {
            metadata: {
              coordinates: {
                x: Math.round(pos.x),
                y: Math.round(pos.y),
              },
            } as any,
          };
        });
        options.onPositionsUpdated?.(updates);
      }
    });

    this.currentLayout.run();
  }

  stop() {
    if (this.currentLayout) {
      this.currentLayout.stop();
    }
  }
}

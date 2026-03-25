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
  private lastOrientation: "landscape" | "portrait" | null = null;

  constructor(private cy: Core) {}

  async apply(
    options: LayoutOptions,
    isInitial = false,
    isForced = false,
    caller = "unknown",
  ) {
    if (!this.cy || this.cy.destroyed()) return;

    const width = this.cy.width();
    const height = this.cy.height();
    const ar = width / height;
    const currentOrientation = ar > 1.2 ? "landscape" : "portrait";
    const orientationChanged =
      this.lastOrientation !== null &&
      this.lastOrientation !== currentOrientation;
    this.lastOrientation = currentOrientation;

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
        // Trigger layout if orientation changed, even if stableLayout is on
        const forceRearrange =
          isForced || (caller === "Window Resize" && orientationChanged);
        await this.applyForceLayout(options, isInitial, forceRearrange, caller);
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
    let hasNewNodes = false;

    // Detect nodes without meaningful positions
    cyNodes.forEach((n) => {
      const p = n.position();
      if (!p || (p.x === 0 && p.y === 0)) {
        hasNewNodes = true;
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

    if (
      options.stableLayout &&
      !isForced &&
      !isExitingTimeline &&
      !randomize &&
      !hasNewNodes
    ) {
      if (
        isInitial ||
        caller === "Load Finalized" ||
        caller === "Window Resize"
      ) {
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

    const baseOptions = getDynamicLayoutOptions(cyNodes.length);

    // Scale gravity based on aspect ratio but don't let it get too high (clumping)
    // Landscape: needs less gravity to allow horizontal spread
    // Portrait: needs slightly more to prevent extreme vertical drift
    const gravity = isLandscape
      ? Math.min(baseOptions.gravity, 0.25)
      : Math.min(baseOptions.gravity, 0.4);

    // If forced from UI, we almost always want some randomization to break clumps
    const shouldRandomize = randomize || (isForced && caller.includes("UI"));

    // Increase bounding box for larger graphs to allow them to breathe
    const boxSize = Math.max(2000, 1000 + Math.sqrt(cyNodes.length) * 100);

    this.currentLayout = this.cy.layout({
      ...baseOptions,
      boundingBox: { x1: -boxSize, y1: -boxSize, x2: boxSize, y2: boxSize },
      gravity,
      randomize: shouldRandomize,
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

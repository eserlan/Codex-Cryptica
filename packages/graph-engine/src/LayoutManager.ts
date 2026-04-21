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

const ORIENTATION_THRESHOLD = 1.2;

export function removeOverlaps(cy: Core, padding = 10, maxIter = 50) {
  const nodes = cy.nodes();
  for (let iter = 0; iter < maxIter; iter++) {
    let anyOverlap = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];
        const p1 = n1.position();
        const p2 = n2.position();
        const r1 = n1.width() / 2;
        const r2 = n2.width() / 2;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = r1 + r2 + padding;
        if (dist < minDist) {
          anyOverlap = true;
          const push = (minDist - dist) / 2;
          if (dist < 0.001) {
            // Nodes at same position — push apart at a fixed angle
            n1.position({ x: p1.x - push, y: p1.y });
            n2.position({ x: p2.x + push, y: p2.y });
          } else {
            const nx = dx / dist;
            const ny = dy / dist;
            n1.position({ x: p1.x - nx * push, y: p1.y - ny * push });
            n2.position({ x: p2.x + nx * push, y: p2.y + ny * push });
          }
        }
      }
    }
    if (!anyOverlap) break;
  }
}

export class LayoutManager {
  private currentLayout: any;

  constructor(private cy: Core) {}

  async apply(
    options: LayoutOptions,
    isInitial = false,
    isForced = false,
    caller = "unknown",
    randomizeForced = false,
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
        await this.applyForceLayout(
          options,
          isInitial,
          isForced,
          caller,
          randomizeForced,
        );
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
    randomizeForced = false,
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
    const isExitingMode =
      caller === "Mode Change Effect" &&
      !options.timelineMode &&
      !options.orbitMode;
    let randomize = isExitingTimeline || isExitingMode;

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

    if (options.stableLayout && !isForced && !randomize && !hasNewNodes) {
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
    const isLandscape = ar > ORIENTATION_THRESHOLD;

    const baseOptions = getDynamicLayoutOptions(cyNodes.length);

    // Cap gravity based on aspect ratio
    // Landscape: allow stronger gravity for the circular pull but cap extreme values
    // Portrait: allow a bit more to counteract vertical drift
    const gravity = isLandscape
      ? Math.min(baseOptions.gravity, 0.25)
      : Math.min(baseOptions.gravity, 0.35);

    // Don't randomize if the user has explicitly locked positions via stableLayout
    const shouldRandomize =
      randomize || (isForced && randomizeForced && !options.stableLayout);

    this.currentLayout = this.cy.layout({
      ...baseOptions,
      boundingBox: { x1: -1200, y1: -1200, x2: 1200, y2: 1200 },
      gravity,
      randomize: shouldRandomize,
      animate: false,
      fit: false,
    } as any);

    const layout = this.currentLayout;
    layout.one("layoutstop", () => {
      if (this.currentLayout !== layout || this.cy.destroyed()) return;

      removeOverlaps(this.cy);

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

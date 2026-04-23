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
  onLayoutComputed?: (durationMs: number) => void;
  onPositionsUpdated?: (updates: Record<string, any>) => void;
}

const ORIENTATION_THRESHOLD = 1.2;
const BASE_LAYOUT_WORKER_TIMEOUT_MS = 15000;
const FIT_ANIMATION_TIMEOUT_MS = 1200;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

interface SerializedLayoutNode {
  data: { id: string; _w: number; _h: number; [key: string]: unknown };
  position: { x: number; y: number };
  actualW: number;
  actualH: number;
}

interface SerializedLayoutEdge {
  data: { id: string; source: string; target: string; [key: string]: unknown };
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededLayoutPosition(
  id: string,
  index: number,
  count: number,
  aspectRatio: number,
) {
  const hash = hashString(id);
  const safeCount = Math.max(1, count);
  const radius = Math.min(1800, 280 + Math.sqrt(safeCount) * 90);
  const angleJitter = (hash / 0xffffffff - 0.5) * 0.35;
  const angle = index * GOLDEN_ANGLE + angleJitter;
  const distance = radius * Math.sqrt((index + 0.5) / safeCount);
  const aspectScale = Math.sqrt(Math.min(2.2, Math.max(0.55, aspectRatio)));

  return {
    x: Math.cos(angle) * distance * aspectScale,
    y: (Math.sin(angle) * distance) / aspectScale,
  };
}

export function getLayoutCollisionSize(
  width: number,
  height: number,
  degree = 0,
) {
  const safeWidth = width || 60;
  const safeHeight = height || 60;
  const hubPadding = Math.min(52, Math.sqrt(Math.max(0, degree)) * 9);

  return {
    width: safeWidth + hubPadding,
    height: safeHeight + hubPadding,
  };
}

/**
 * Resolves node overlaps using a spatial grid so only nearby pairs are checked.
 * O(N) per iteration amortised vs O(N²) for a naive nested loop.
 *
 * Cell size = 2·maxRadius + padding guarantees that two nodes in non-adjacent
 * grid cells can never overlap, so checking the 3×3 neighbourhood is sufficient.
 */
export function removeOverlaps(cy: Core, padding = 10, maxIter = 20) {
  const nodes = cy.nodes();
  const n = nodes.length;
  if (n < 2) return;

  const radii = new Float64Array(n);
  let maxRadius = 0;
  for (let i = 0; i < n; i++) {
    radii[i] = (nodes[i] as any).width() / 2;
    if (radii[i] > maxRadius) maxRadius = radii[i];
  }
  const cellSize = 2 * maxRadius + padding;

  // Work with flat typed arrays — avoids repeated Cytoscape method-call overhead
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const p = (nodes[i] as any).position();
    xs[i] = p.x;
    ys[i] = p.y;
  }

  for (let iter = 0; iter < maxIter; iter++) {
    const grid = new Map<string, number[]>();
    for (let i = 0; i < n; i++) {
      const key = `${Math.floor(xs[i] / cellSize)},${Math.floor(ys[i] / cellSize)}`;
      let cell = grid.get(key);
      if (!cell) {
        cell = [];
        grid.set(key, cell);
      }
      cell.push(i);
    }

    let anyOverlap = false;
    for (let i = 0; i < n; i++) {
      const gcx = Math.floor(xs[i] / cellSize);
      const gcy = Math.floor(ys[i] / cellSize);
      const r1 = radii[i];
      for (let ddx = -1; ddx <= 1; ddx++) {
        for (let ddy = -1; ddy <= 1; ddy++) {
          const cell = grid.get(`${gcx + ddx},${gcy + ddy}`);
          if (!cell) continue;
          for (const j of cell) {
            if (j <= i) continue;
            const dx = xs[j] - xs[i];
            const dy = ys[j] - ys[i];
            const minDist = r1 + radii[j] + padding;
            const dist2 = dx * dx + dy * dy;
            if (dist2 >= minDist * minDist) continue;
            anyOverlap = true;
            const dist = Math.sqrt(dist2);
            const push = (minDist - dist) / 2;
            if (dist < 0.001) {
              xs[i] -= push;
              xs[j] += push;
            } else {
              const nx = dx / dist;
              const ny = dy / dist;
              xs[i] -= nx * push;
              ys[i] -= ny * push;
              xs[j] += nx * push;
              ys[j] += ny * push;
            }
          }
        }
      }
    }
    if (!anyOverlap) break;
  }

  cy.batch(() => {
    for (let i = 0; i < n; i++) {
      (nodes[i] as any).position({ x: xs[i], y: ys[i] });
    }
  });
}

export class LayoutManager {
  private currentLayout: any;
  private worker: Worker | null = null;
  private jobId = 0;
  private pendingJobId: number | null = null;
  private pendingWorkerResolve:
    | ((result: Record<string, { x: number; y: number }> | null) => void)
    | null = null;

  constructor(private cy: Core) {}

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL("./layout.worker", import.meta.url), {
        type: "module",
      });
    }
    return this.worker;
  }

  private runInWorker(
    nodes: SerializedLayoutNode[],
    edges: SerializedLayoutEdge[],
    options: Record<string, any>,
    timeoutMs = BASE_LAYOUT_WORKER_TIMEOUT_MS,
  ): Promise<Record<string, { x: number; y: number }> | null> {
    // If a job is already in flight, terminate the worker rather than queuing
    // behind it — stale layouts piling up is what makes vault switches slow.
    if (this.pendingJobId !== null) {
      this.pendingWorkerResolve?.(null);
      this.jobId++;
      this.worker?.terminate();
      this.worker = null;
      this.pendingJobId = null;
      this.pendingWorkerResolve = null;
    }

    const jobId = ++this.jobId;
    this.pendingJobId = jobId;
    const worker = this.getWorker();

    return new Promise((resolve) => {
      let settled = false;
      let timeout: ReturnType<typeof setTimeout> | null = null;
      const done = (
        result: Record<string, { x: number; y: number }> | null,
      ) => {
        if (settled) return;
        settled = true;
        if (timeout) clearTimeout(timeout);
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", onError);
        worker.removeEventListener("messageerror", onError);
        if (this.pendingJobId === jobId) this.pendingJobId = null;
        if (this.pendingWorkerResolve === done)
          this.pendingWorkerResolve = null;
        resolve(result);
      };
      const onMessage = (e: MessageEvent) => {
        if (e.data.jobId !== jobId) return;
        done(e.data.positions ?? null);
      };
      const onError = () => done(null);
      this.pendingWorkerResolve = done;
      timeout = setTimeout(() => {
        if (this.worker === worker) {
          worker.terminate();
          this.worker = null;
        }
        done(null);
      }, timeoutMs);
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onError);
      worker.addEventListener("messageerror", onError);
      try {
        worker.postMessage({ jobId, nodes, edges, options });
      } catch {
        done(null);
      }
    });
  }

  private animateFitAndStop(
    options: LayoutOptions,
    easing: "ease-out-cubic" | "ease-out-quad",
  ) {
    let finished = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      options.onLayoutStop?.();
    };

    timeout = setTimeout(finish, FIT_ANIMATION_TIMEOUT_MS);

    this.cy.animate({
      fit: { eles: this.cy.elements(), padding: 20 },
      duration: 800,
      easing,
      complete: finish,
    });
  }

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

      // Handle visibility classes — only pay the iteration cost in timeline mode
      if (options.timelineMode) {
        this.cy.batch(() => {
          this.cy.nodes().forEach((node) => {
            const data = node.data() as GraphNode["data"];
            if (hasTimelineDate({ group: "nodes", data })) {
              node.removeClass("timeline-hidden");
            } else {
              node.addClass("timeline-hidden");
            }
          });
        });
      } else {
        this.cy.batch(() => {
          this.cy.nodes().forEach((node) => {
            node.removeClass("timeline-hidden");
          });
        });
      }

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
      this.animateFitAndStop(options, "ease-out-cubic");
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

    const isExitingTimeline =
      caller === "Timeline Toggle" && !options.timelineMode;
    const isExitingMode =
      caller === "Mode Change Effect" &&
      !options.timelineMode &&
      !options.orbitMode;
    let randomize = isExitingTimeline || isExitingMode;

    // Single pass: detect new nodes (at origin) and full-clump in one loop
    let hasNewNodes = false;
    let nodesAtOrigin = 0;
    cyNodes.forEach((n) => {
      const p = n.position();
      if (!p || (p.x === 0 && p.y === 0)) {
        hasNewNodes = true;
        nodesAtOrigin++;
      }
    });
    if (!randomize && cyNodes.length > 1 && nodesAtOrigin === cyNodes.length) {
      randomize = true;
    }

    const isFitOnly =
      options.stableLayout &&
      !randomize &&
      !hasNewNodes &&
      (!isForced || caller === "Load Finalized" || caller === "Window Resize");

    if (isFitOnly) {
      if (
        isInitial ||
        caller === "Load Finalized" ||
        caller === "Window Resize"
      ) {
        this.cy.resize();
        this.animateFitAndStop(options, "ease-out-cubic");
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

    const gravity = isLandscape
      ? Math.min(baseOptions.gravity, 0.12)
      : Math.min(baseOptions.gravity, 0.15);

    // Don't randomize if the user has explicitly locked positions via stableLayout
    const manualRedrawRandomize =
      caller === "UI Redraw Button" && isForced && randomizeForced;
    const shouldRandomize =
      randomize ||
      manualRedrawRandomize ||
      (isForced && randomizeForced && !options.stableLayout);

    if (this.cy.destroyed()) {
      options.onLayoutStop?.();
      return;
    }

    // Serialize graph for the worker — copy only what the worker needs so the
    // postMessage payload stays small regardless of how much data edges carry.
    const edges = Array.from(this.cy.edges()).map((e) => ({
      data: { id: e.id(), source: e.source().id(), target: e.target().id() },
    }));
    const degrees = new Map<string, number>();
    for (const edge of edges) {
      degrees.set(edge.data.source, (degrees.get(edge.data.source) ?? 0) + 1);
      degrees.set(edge.data.target, (degrees.get(edge.data.target) ?? 0) + 1);
    }
    const maxDegree = Math.max(0, ...degrees.values());
    const hubGravity = gravity * (1 - Math.min(0.45, maxDegree * 0.012));
    const nodes = Array.from(cyNodes).map((n, index) => {
      const p = n.position();
      const w = n.width();
      const h = n.height();
      const layoutSize = getLayoutCollisionSize(w, h, degrees.get(n.id()) ?? 0);
      const position = shouldRandomize
        ? seededLayoutPosition(n.id(), index, cyNodes.length, ar)
        : { x: p.x, y: p.y };
      return {
        data: {
          id: n.id(),
          _degree: degrees.get(n.id()) ?? 0,
          _w: layoutSize.width,
          _h: layoutSize.height,
        },
        position,
        actualW: w || 60,
        actualH: h || 60,
      };
    });
    const layoutOptions = {
      ...baseOptions,
      boundingBox: { x1: -2400, y1: -2400, x2: 2400, y2: 2400 },
      gravity: hubGravity,
      randomize: shouldRandomize,
      animate: false,
      fit: false,
    };

    // Scale timeout: draft quality (500+ nodes) can take 20-30s on slow machines
    const workerTimeout = Math.min(
      60000,
      Math.max(BASE_LAYOUT_WORKER_TIMEOUT_MS, nodes.length * 30),
    );
    const layoutStartTime = performance.now();
    const positions = await this.runInWorker(
      nodes,
      edges,
      layoutOptions,
      workerTimeout,
    );

    if (!positions || this.cy.destroyed()) {
      options.onLayoutStop?.();
      return;
    }

    // Apply positions back onto the real cy instance
    this.cy.batch(() => {
      for (const [id, pos] of Object.entries(positions)) {
        const node = this.cy.$id(id);
        if (node.length) node.position(pos);
      }
    });

    options.onLayoutComputed?.(Math.round(performance.now() - layoutStartTime));

    this.animateFitAndStop(options, "ease-out-quad");

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
  }

  stop() {
    this.jobId++; // Invalidate any in-flight worker result
    this.pendingWorkerResolve?.(null);
    this.pendingWorkerResolve = null;
    this.pendingJobId = null;
    if (this.currentLayout) {
      this.currentLayout.stop();
      this.currentLayout = null;
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

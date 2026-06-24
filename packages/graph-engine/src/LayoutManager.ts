import type { Core } from "cytoscape";
import type { Entity } from "schema";
import {
  getDynamicLayoutOptions,
  getTimelineLayout,
  setCentralNode,
  hasTimelineDate,
  type GraphNode,
} from "./index";
import { isLayoutCollinear } from "./geometry";

export interface LayoutOptions {
  timelineMode: boolean;
  timelineAxis: "x" | "y";
  timelineScale: number;
  orbitMode: boolean;
  centralNodeId: string | null;
  stableLayout: boolean;
  isGuest: boolean;
  isMobile?: boolean;
  /**
   * Camera behavior for this layout pass. "fit" (default) may animate the
   * viewport to fit all elements; "preserve" keeps the user's current
   * pan/zoom. Only honored on the stable fit-only path — full layout solves
   * always fit because node positions may change wholesale.
   */
  viewportPolicy?: "preserve" | "fit";
  onLayoutStart?: () => void;
  onLayoutStop?: () => void;
  onLayoutComputed?: (durationMs: number) => void;
  onPositionsUpdated?: (
    updates: Record<string, Partial<Entity>>,
    meta?: { healed?: boolean },
  ) => void;
}

/**
 * Structured alternative to the positional-boolean `apply` args.
 * T11 will migrate all call sites to this shape; T12 will drop the
 * legacy positional args entirely.
 */
export interface LayoutRequest {
  /** Human-readable label used for telemetry / debug logs (replaces `caller`). */
  reason: string;
  /** Force fcose to re-randomize node positions (replaces `randomizeForced`). */
  reseed?: boolean;
  /** Camera policy for this pass — overrides the viewportPolicy in LayoutOptions when set. */
  viewport?: "preserve" | "fit";
  /** True on the first full layout pass after vault load. */
  isInitial?: boolean;
  /** True when the layout was explicitly requested (e.g. toolbar button). */
  isForced?: boolean;
  /** True when new nodes were added since the last layout. */
  hasNewNodes?: boolean;
  /** True when nodes were removed since the last layout. */
  hasRemovedNodes?: boolean;
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

export { isLayoutCollinear } from "./geometry";

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
    | ((
        result: Record<
          string,
          { metadata: { coordinates: { x: number; y: number } } }
        > | null,
      ) => void)
    | null = null;

  constructor(private cy: Core) {}

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL("./layout.worker.ts", import.meta.url), {
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
  ): Promise<Record<
    string,
    { metadata: { coordinates: { x: number; y: number } } }
  > | null> {
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
        result: Record<
          string,
          { metadata: { coordinates: { x: number; y: number } } }
        > | null,
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

  async apply(request: LayoutRequest, options: LayoutOptions): Promise<void> {
    if (request.viewport !== undefined) {
      options = { ...options, viewportPolicy: request.viewport };
    }

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

      const isInitial = request.isInitial ?? false;

      if (options.isGuest && isInitial) {
        this.cy.nodes().removeData("isPendingLayout");
        this.cy.nodes(".pending-layout").removeClass("pending-layout");
        this.cy.fit(this.cy.nodes(), 20);
        // On mobile the full-fit zoom is often unreadably small — enforce a minimum
        if (options.isMobile && this.cy.zoom() < 0.6) {
          this.cy.zoom({
            level: 0.6,
            renderedPosition: {
              x: this.cy.width() / 2,
              y: this.cy.height() / 2,
            },
          });
          this.cy.center();
        }
        options.onLayoutStop?.();
        return;
      }

      if (options.timelineMode) {
        await this.applyTimelineLayout(options);
      } else if (options.orbitMode && options.centralNodeId) {
        await this.applyOrbitLayout(options, isInitial);
      } else {
        await this.applyForceLayout(options, request);
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

  private async applyForceLayout(options: LayoutOptions, req: LayoutRequest) {
    const isInitial = req.isInitial ?? false;
    const isForced = req.isForced ?? false;
    const reason = req.reason;
    const reseed = req.reseed ?? false;

    const cyNodes = this.cy.nodes();

    const isExitingTimeline =
      reason === "Timeline Toggle" && !options.timelineMode;
    const isExitingMode =
      reason === "Mode Change Effect" &&
      !options.timelineMode &&
      !options.orbitMode;
    let randomize = isExitingTimeline || isExitingMode;

    // Detect full-clump (all nodes at origin) — force randomize so fcose can spread them.
    // Also detect all-pending (every node has .pending-layout, meaning no coords were saved).
    // Both checks are kept intentionally:
    //   - pendingCount catches fresh vaults where transformer sets the class on all nodes
    //   - nodesAtOrigin catches legacy vaults whose coords were saved as (0,0) — those nodes
    //     take the hasValidCoords path in transformer.ts and land at origin WITHOUT the class
    const positions: { x: number; y: number }[] = [];
    let nodesAtOrigin = 0;
    cyNodes.forEach((n) => {
      const p = n.position();
      positions.push(p);
      if (!p || (p.x === 0 && p.y === 0)) nodesAtOrigin++;
    });
    const pendingCount = this.cy.nodes(".pending-layout").length;

    // Heal a degenerate "diagonal slash" — saved coords collapsed onto a line.
    // This is checked on *every* force pass, not just the initial one: a vault
    // switch reuses the cy instance and can run a non-initial incremental solve
    // (or fit-only) over the persisted diagonal, which would preserve the slash.
    // A legitimate fcose layout is never collinear, so forcing a randomized
    // re-solve whenever we detect collinearity is safe across all paths.
    const isDegenerateSlash = isLayoutCollinear(positions);

    const needsInitialSolve =
      isInitial &&
      cyNodes.length > 1 &&
      (pendingCount === cyNodes.length || nodesAtOrigin === cyNodes.length);

    if (!randomize && (needsInitialSolve || isDegenerateSlash)) {
      randomize = true;
    }

    const isManualRedraw = reason === "UI Redraw Button" && isForced;
    const isFitOnly = options.stableLayout && !randomize && !isManualRedraw;

    if (isFitOnly) {
      this.fitOnly(options);
      return;
    }

    const manualRedrawRandomize =
      reason === "UI Redraw Button" && isForced && reseed;
    const shouldRandomize =
      randomize ||
      manualRedrawRandomize ||
      (isForced && reseed && !options.stableLayout);

    await this.solveAndFit(options, shouldRandomize, isDegenerateSlash);
  }

  private fitOnly(options: LayoutOptions): void {
    this.cy.resize();

    const pendingNodes = this.cy.nodes(".pending-layout");
    if (pendingNodes.nonempty()) {
      // Snap new nodes to sensible positions before revealing them so the
      // viewport doesn't jump to include their far-away spiral seed positions.
      const placedNodes = this.cy.nodes().not(pendingNodes);
      let fallbackX = 0;
      let fallbackY = 0;
      if (placedNodes.nonempty()) {
        placedNodes.forEach((n) => {
          const p = n.position();
          fallbackX += p.x;
          fallbackY += p.y;
        });
        fallbackX /= placedNodes.length;
        fallbackY /= placedNodes.length;
      }

      pendingNodes.forEach((node) => {
        const neighbors = node.neighborhood().nodes().not(pendingNodes);
        if (neighbors.nonempty()) {
          let sumX = 0;
          let sumY = 0;
          neighbors.forEach((n) => {
            const p = n.position();
            sumX += p.x;
            sumY += p.y;
          });
          node.position({
            x: sumX / neighbors.length,
            y: sumY / neighbors.length,
          });
        } else if (placedNodes.nonempty()) {
          node.position({ x: fallbackX, y: fallbackY });
        }
        // If all nodes are new (initial load), keep spiral seed positions
      });
    }

    this.cy.nodes().removeData("isPendingLayout");
    pendingNodes.removeClass("pending-layout");

    this.persistPositions(pendingNodes, options);

    if (options.viewportPolicy === "preserve") {
      // Halt any in-flight fit animation from a previous layout pass —
      // otherwise it would keep moving the camera after this update
      // promised to preserve the viewport.
      this.cy.stop();
      options.onLayoutStop?.();
    } else {
      this.animateFitAndStop(options, "ease-out-cubic");
    }
  }

  private async solveAndFit(
    options: LayoutOptions,
    shouldRandomize: boolean,
    healed = false,
  ): Promise<void> {
    const cyNodes = this.cy.nodes();
    const width = this.cy.width();
    const height = this.cy.height();
    const ar = width / height;
    const isLandscape = ar > ORIENTATION_THRESHOLD;

    const baseOptions = getDynamicLayoutOptions(cyNodes.length);

    const gravity = isLandscape
      ? Math.min(baseOptions.gravity, 0.12)
      : Math.min(baseOptions.gravity, 0.15);

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
    let maxDegree = 0;
    for (const degree of degrees.values()) {
      if (degree > maxDegree) {
        maxDegree = degree;
      }
    }
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
      for (const [id, update] of Object.entries(positions)) {
        const node = this.cy.$id(id);
        if (node.length) {
          const pos = update.metadata.coordinates;
          node.position(pos);
          node.removeData("isPendingLayout");
          node.removeClass("pending-layout");
        }
      }
    });

    options.onLayoutComputed?.(Math.round(performance.now() - layoutStartTime));

    this.animateFitAndStop(options, "ease-out-quad");

    this.persistPositions(this.cy.nodes(), options, healed);
  }

  private persistPositions(
    nodes: ReturnType<Core["nodes"]>,
    options: Pick<LayoutOptions, "isGuest" | "onPositionsUpdated">,
    healed = false,
  ): void {
    if (options.isGuest || nodes.length === 0) return;
    const updates: Record<string, Partial<Entity>> = {};
    nodes.forEach((node) => {
      const pos = node.position();
      updates[node.id()] = {
        metadata: {
          coordinates: { x: Math.round(pos.x), y: Math.round(pos.y) },
        },
      };
    });
    options.onPositionsUpdated?.(updates, { healed });
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

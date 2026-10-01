import type { Core } from "cytoscape";
import { FlushScheduler } from "./flush-scheduler";

export interface ImageManagerOptions {
  showImages: boolean;
  resolveImageUrl: (path: string) => Promise<string | null>;
  releaseImageUrl: (path: string) => void;
  /**
   * May resolve asynchronously: silhouette artwork is fetched rather than
   * inlined, so this can return a promise for the tinted data URI.
   */
  resolveSilhouetteUrl?: (node: any) => string | null | Promise<string | null>;
  /**
   * Anything outside node data that changes what `resolveSilhouetteUrl`
   * returns — today the theme, whose palette decides the silhouette's fill
   * colour (issue #2680). Folded into the per-node silhouette key so a theme
   * switch re-resolves already-painted silhouettes instead of leaving them in
   * the previous theme's colour.
   */
  silhouetteVariant?: string;
  batchSize?: number;
  /**
   * How long finished images are held back so they can be shown together once
   * the whole pass is done. After this, whatever is ready is shown in spaced
   * batches, so a few slow hosts cannot keep the graph bare. Defaults to 20 s.
   */
  holdMaxMs?: number;
  onBatchApplied?: (count: number) => void;
  onLog?: (message: string) => void;
  onError?: (error: any) => void;
}

/**
 * Images resolved at once. Most of a resolve is waiting on a remote host, so
 * this can be generous: the CPU-heavy part (thumbnail generation) has its own,
 * much smaller limit in the asset manager. Six was measured to be too few: with
 * a quarter of images on slow hosts, the graph took three times as long to
 * finish as it did with no limit. Cached images are the other case: each resolve
 * is a chain of small file-system awaits that each wait for the main thread,
 * which Cytoscape redraws keep busy, so on a vault of ~1,600 nodes 24 at once
 * finished at 41 s and 96 at once at 29 s (single runs, same vault).
 */
export const RESOLVE_CONCURRENCY = 96;

type ResolvedVisual = {
  node: any;
  url: string;
  isSilhouette: boolean;
  skip: boolean;
  oldUrl: string | undefined;
};

export class GraphImageManager {
  private urlCache = new Map<string, string>();
  private resolvingIds = new Set<string>();
  private nodePathMap = new Map<string, string>();
  private failedImages = new Map<string, { path: string; retryAt: number }>();
  private silhouetteVariant = "";
  private latestOptions?: ImageManagerOptions;
  private viewportTimer?: ReturnType<typeof setTimeout>;
  private listening = false;
  private activePass = false;
  private pendingSync = false;
  private generation = 0;

  private readonly onViewportChange = () => {
    if (this.viewportTimer !== undefined) return;
    this.viewportTimer = setTimeout(() => {
      this.viewportTimer = undefined;
      if (this.latestOptions) this.sync(this.latestOptions);
    }, 80);
  };

  constructor(
    private cy: Core,
    private now: () => number = () => Date.now(),
  ) {}

  sync(options: ImageManagerOptions) {
    if (!this.cy || this.cy.destroyed()) return;

    this.latestOptions = options;
    if (!options.showImages) {
      this.generation++;
      this.pendingSync = false;
      this.stopViewportWatch();
      this.clearImages(options);
      return;
    }

    this.startViewportWatch();

    // Captured for this pass: the stamp written when the results land has to
    // be the variant that produced them, or a theme switch that overlaps an
    // in-flight resolve would mark the old colour as current.
    const variant = options.silhouetteVariant ?? "";
    this.silhouetteVariant = variant;

    // Keep one pool across overlapping syncs. Viewport changes drop queued
    // offscreen work below; a fresh pass picks up newly visible nodes.
    if (this.activePass) {
      this.pendingSync = true;
      return;
    }

    const nodesNeedingVisuals = Array.from(
      this.cy.nodes().filter((node) => this.needsVisual(node)),
    ).filter((node) => this.isNearViewport(node));

    if (nodesNeedingVisuals.length === 0) return;

    options.onLog?.(
      `[GraphImageManager] Syncing visuals for ${nodesNeedingVisuals.length} nodes...`,
    );

    // Mark them all as resolving immediately
    nodesNeedingVisuals.forEach((n) => {
      this.resolvingIds.add(n.id());
    });

    this.activePass = true;
    void this.resolveAndApply(
      this.inViewportFirst(Array.from(nodesNeedingVisuals)),
      {
        options,
        variant,
        generation: this.generation,
      },
    );
  }

  private canResolve(node: any): boolean {
    return (
      !node.hidden?.() && !node.removed?.() && !this.resolvingIds.has(node.id())
    );
  }

  private needsVisual(node: any): boolean {
    if (!this.canResolve(node)) return false;
    if (!node.data("resolvedImage")) return true;
    const currentImagePath = node.data("thumbnail") || node.data("image");
    const isSilhouette = !!node.data("isSilhouette");
    const appliedPath = this.nodePathMap.get(node.id());
    if (this.nodePathMap.has(node.id()) && appliedPath !== currentImagePath)
      return true;
    if (
      !!currentImagePath === isSilhouette &&
      !this.hasCurrentFallback(node.id(), currentImagePath)
    )
      return true;
    return (
      isSilhouette &&
      this.getSilhouetteKey(node) !== node.data("appliedSilhouetteKey")
    );
  }

  private hasCurrentFallback(nodeId: string, path: string): boolean {
    const failure = this.failedImages.get(nodeId);
    return !!failure && failure.path === path && this.now() < failure.retryAt;
  }

  private containsPosition(
    p: { x: number; y: number },
    extent: { x1: number; y1: number; x2: number; y2: number },
    padX = 0,
    padY = 0,
  ): boolean {
    return (
      p.x >= extent.x1 - padX &&
      p.x <= extent.x2 + padX &&
      p.y >= extent.y1 - padY &&
      p.y <= extent.y2 + padY
    );
  }

  /** Load nearby nodes only, with a small margin to prepare for panning. */
  private isNearViewport(node: any): boolean {
    const extent = this.cy.extent?.();
    const p = node.position?.();
    if (!extent || !p) return true;
    const padX =
      (extent.x2 - extent.x1) * 0.15 + (node.outerWidth?.() ?? 0) / 2;
    const padY =
      (extent.y2 - extent.y1) * 0.15 + (node.outerHeight?.() ?? 0) / 2;
    return this.containsPosition(p, extent, padX, padY);
  }

  /** Visible nodes precede the small prefetch margin. */
  private inViewportFirst(nodes: any[]): any[] {
    const extent = this.cy.extent?.();
    if (!extent) return nodes;
    const isVisible = (node: any) => {
      const p = node.position?.();
      return !!p && this.containsPosition(p, extent);
    };
    return nodes
      .filter(isVisible)
      .concat(nodes.filter((node) => !isVisible(node)));
  }

  private async resolveCustomImage(
    imagePath: string,
    options: ImageManagerOptions,
    isCurrent: () => boolean,
  ): Promise<string> {
    const cached = this.urlCache.get(imagePath);
    if (cached) return cached;
    const url = (await options.resolveImageUrl(imagePath)) || "";
    if (!url) return "";
    if (isCurrent()) this.urlCache.set(imagePath, url);
    else options.releaseImageUrl(imagePath);
    return url;
  }

  private async resolveImageOrFallback(
    node: any,
    path: string,
    options: ImageManagerOptions,
    isCurrent: () => boolean,
  ): Promise<string> {
    try {
      const url = await this.resolveCustomImage(path, options, isCurrent);
      const original = node.data("image");
      if (!url && original && original !== path) {
        return await this.resolveCustomImage(original, options, isCurrent);
      }
      return url;
    } catch (error) {
      if (!options.resolveSilhouetteUrl) throw error;
      options.onError?.(error);
      return "";
    }
  }

  private async resolveVisual(
    node: any,
    options: ImageManagerOptions,
    isCurrent: () => boolean,
  ): Promise<ResolvedVisual> {
    const oldUrl = node.data("resolvedImage") as string | undefined;
    const imagePath = node.data("thumbnail") || node.data("image");
    if (imagePath) {
      const url = await this.resolveImageOrFallback(
        node,
        imagePath,
        options,
        isCurrent,
      );
      if (url) {
        this.failedImages.delete(node.id());
        return { node, url, isSilhouette: false, skip: false, oldUrl };
      }
      this.failedImages.set(node.id(), {
        path: imagePath,
        retryAt: this.now() + 5 * 60_000,
      });
    }

    if (options.resolveSilhouetteUrl) {
      const silUrl = await options.resolveSilhouetteUrl(node);
      return {
        node,
        url: silUrl || "",
        isSilhouette: true,
        // A silhouette that did not resolve is a fetch that failed,
        // not artwork that does not exist. Leaving it unstamped keeps
        // the node stale so the next sync tries again — otherwise one
        // offline moment would cost the glyph until the entity itself
        // changed.
        skip: !silUrl,
        oldUrl,
      };
    }

    return {
      node,
      url: "",
      isSilhouette: false,
      skip: Boolean(imagePath),
      oldUrl,
    };
  }

  /**
   * Resolves visuals through a bounded pool; `FlushScheduler` decides when the
   * results are painted (held for one combined paint, with a timeout).
   */
  private async resolveAndApply(
    nodes: any[],
    {
      options,
      variant,
      generation,
    }: {
      options: ImageManagerOptions;
      variant: string;
      generation: number;
    },
  ) {
    const start = performance.now();
    const ready: ResolvedVisual[] = [];
    let applied = 0;
    let stopped = false;
    const shouldStop = () =>
      stopped ||
      this.cy.destroyed() ||
      !this.latestOptions?.showImages ||
      generation !== this.generation;

    const flush = () => {
      if (ready.length === 0) return;
      if (shouldStop()) {
        stopped = true;
        ready.length = 0;
        return;
      }
      const chunk = ready.splice(0, ready.length);
      this.cy.batch(() => {
        for (const visual of chunk) {
          try {
            this.applyVisual(visual, variant, options);
          } finally {
            this.resolvingIds.delete(visual.node.id());
          }
        }
      });
      // Cytoscape updates styles for changed node data when the batch ends.
      // Refreshing the stylesheet here would also revisit every untouched node.
      applied += chunk.length;
      options.onBatchApplied?.(chunk.length);
    };

    const scheduler = new FlushScheduler(flush, {
      batchSize: options.batchSize,
      holdMaxMs: options.holdMaxMs,
    });

    let next = 0;
    const worker = async () => {
      while (next < nodes.length && !shouldStop()) {
        const node = nodes[next++];
        // A pan during this pass must not drain its old offscreen queue.
        if (!this.isNearViewport(node) || node.removed?.()) {
          this.resolvingIds.delete(node.id());
          continue;
        }
        try {
          ready.push(
            await this.resolveVisual(node, options, () => !shouldStop()),
          );
        } catch (err) {
          // One failed resolve must not lose the rest. The node stays
          // unstamped, so the next sync tries it again.
          this.resolvingIds.delete(node.id());
          options.onError?.(err);
        }
        scheduler.schedule(ready.length);
      }
    };

    try {
      await Promise.all(
        Array.from(
          { length: Math.min(RESOLVE_CONCURRENCY, nodes.length) },
          () => worker(),
        ),
      );
      scheduler.cancel();
      scheduler.flushNow();
      if (!stopped) {
        options.onLog?.(
          `[GraphImageManager] Resolved ${applied} node visuals in ${(performance.now() - start).toFixed(2)}ms`,
        );
      }
    } catch (err) {
      options.onError?.(err);
    } finally {
      scheduler.cancel();
      // Anything the pool never reached (a destroyed graph, images switched
      // off) is released so a later sync can pick it up.
      for (const node of nodes) this.resolvingIds.delete(node.id());
      this.finishPass();
    }
  }

  private finishPass() {
    this.activePass = false;
    if (this.pendingSync && this.latestOptions && !this.cy.destroyed()) {
      this.pendingSync = false;
      this.sync(this.latestOptions);
    }
  }

  private applyVisual(
    { node, url, isSilhouette, oldUrl, skip }: ResolvedVisual,
    variant: string,
    options: ImageManagerOptions,
  ) {
    if (skip) return;
    const newUrl = url || "none"; // Mark as "none" to avoid infinite retries and prevent broken image states

    const nodeId = node.id();
    const oldPath = this.nodePathMap.get(nodeId);
    const currentPath = node.data("thumbnail") || node.data("image");
    if (currentPath) this.nodePathMap.set(nodeId, currentPath);
    else this.nodePathMap.delete(nodeId);
    if (
      oldPath &&
      oldPath !== currentPath &&
      !Array.from(this.nodePathMap.values()).includes(oldPath)
    ) {
      options.releaseImageUrl(oldPath);
      this.urlCache.delete(oldPath);
    }
    if (newUrl !== oldUrl) node.data("resolvedImage", newUrl);
    this.stampSilhouette(node, isSilhouette, variant);
  }

  private stampSilhouette(node: any, isSilhouette: boolean, variant: string) {
    if (isSilhouette) {
      if (!node.data("isSilhouette")) node.data("isSilhouette", true);
      const key = this.getSilhouetteKey(node, variant);
      if (node.data("appliedSilhouetteKey") !== key)
        node.data("appliedSilhouetteKey", key);
    } else if (node.data("isSilhouette")) {
      node.removeData("isSilhouette");
      node.removeData("appliedSilhouetteKey");
    }
  }

  private getSilhouetteKey(
    node: any,
    variant = this.silhouetteVariant,
  ): string {
    const rawSil = node.data("silhouette") ?? "";
    const rawType = node.data("type") ?? "";
    const rawLabels = Array.isArray(node.data("labels"))
      ? node.data("labels").join(",")
      : "";
    const rawLabel =
      typeof node.data("label") === "string" ? node.data("label") : "";
    return `${rawSil}|${rawType}|${rawLabels}|${rawLabel}|${variant}`;
  }

  /** Results can be cached while waiting for their paint batch. */
  private releaseUnpainted(options?: ImageManagerOptions) {
    if (!options) return;
    const paintedPaths = new Set(this.nodePathMap.values());
    for (const path of this.urlCache.keys()) {
      if (!paintedPaths.has(path)) options.releaseImageUrl(path);
    }
  }

  private clearImages(options?: ImageManagerOptions) {
    this.releaseUnpainted(options);
    this.resolvingIds.clear();
    this.failedImages.clear();
    this.urlCache.clear(); // Ensure we don't hold onto stale/revoked blob URLs
    this.cy
      .nodes()
      .filter((n) => n.data("resolvedImage"))
      .forEach((node) => {
        const nodeId = node.id();
        const path = this.nodePathMap.get(nodeId);
        if (path && options) {
          options.releaseImageUrl(path);
        }
        this.nodePathMap.delete(nodeId);
        node.removeData("resolvedImage");
        node.removeData("isSilhouette");
        node.removeData("appliedSilhouetteKey");
      });
    this.cy.style().update();
  }

  private startViewportWatch() {
    if (!this.listening && this.cy.on) {
      this.cy.on("viewport layoutstop position", this.onViewportChange);
      this.listening = true;
    }
  }

  private stopViewportWatch() {
    if (this.viewportTimer !== undefined) clearTimeout(this.viewportTimer);
    this.viewportTimer = undefined;
    if (this.listening)
      this.cy.off("viewport layoutstop position", this.onViewportChange);
    this.listening = false;
  }

  destroy(options?: ImageManagerOptions) {
    this.generation++;
    this.latestOptions = undefined;
    this.pendingSync = false;
    this.stopViewportWatch();
    this.releaseUnpainted(options);
    if (options) {
      this.nodePathMap.forEach((path) => {
        options.releaseImageUrl(path);
      });
    }
    this.urlCache.clear();
    this.nodePathMap.clear();
    this.failedImages.clear();
    this.resolvingIds.clear();
  }
}

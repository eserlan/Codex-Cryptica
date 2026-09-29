import type { Core } from "cytoscape";

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
  onBatchApplied?: (count: number) => void;
  onLog?: (message: string) => void;
  onError?: (error: any) => void;
}

/** Images resolved at once. Enough to keep the network busy, few enough that they do not starve each other. */
const RESOLVE_CONCURRENCY = 6;
/** Resolved visuals are painted together once this many are ready... */
const FLUSH_SIZE = 20;
/** ...or after this long, so a slow image never holds back the ones that finished. */
const FLUSH_DELAY_MS = 40;

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
  private silhouetteVariant = "";

  constructor(private cy: Core) {}

  sync(options: ImageManagerOptions) {
    if (!this.cy || this.cy.destroyed()) return;

    if (!options.showImages) {
      this.clearImages(options);
      return;
    }

    // Captured for this pass: the stamp written when the results land has to
    // be the variant that produced them, or a theme switch that overlaps an
    // in-flight resolve would mark the old colour as current.
    const variant = options.silhouetteVariant ?? "";
    this.silhouetteVariant = variant;

    const nodesNeedingVisuals = this.cy.nodes().filter((n) => {
      if (this.resolvingIds.has(n.id())) return false;
      const resolved = n.data("resolvedImage");
      if (!resolved) return true;

      const currentImagePath = n.data("thumbnail") || n.data("image");
      const isSil = !!n.data("isSilhouette");
      const currentSilKey = this.getSilhouetteKey(n);
      const cachedSilKey = n.data("appliedSilhouetteKey");

      // Stale if custom image state transitioned to/from silhouette,
      // or if any silhouette-determining field (override, labels, type, title) changed
      if (!!currentImagePath === isSil) return true;
      if (isSil && currentSilKey !== cachedSilKey) return true;
      return false;
    });

    if (nodesNeedingVisuals.length === 0) return;

    options.onLog?.(
      `[GraphImageManager] Syncing visuals for ${nodesNeedingVisuals.length} nodes...`,
    );

    // Mark them all as resolving immediately
    nodesNeedingVisuals.forEach((n) => {
      this.resolvingIds.add(n.id());
    });

    void this.resolveAndApply(
      this.inViewportFirst(Array.from(nodesNeedingVisuals)),
      {
        options,
        variant,
      },
    );
  }

  /**
   * Nodes the user can see are resolved first, so a large vault paints its
   * visible pictures before it works through the ones off-screen.
   */
  private inViewportFirst(nodes: any[]): any[] {
    const extent = this.cy.extent?.();
    if (!extent) return nodes;
    const isVisible = (node: any) => {
      const p = node.position?.();
      return (
        !!p &&
        p.x >= extent.x1 &&
        p.x <= extent.x2 &&
        p.y >= extent.y1 &&
        p.y <= extent.y2
      );
    };
    const visible = nodes.filter(isVisible);
    const shown = new Set(visible);
    return visible.concat(nodes.filter((node) => !shown.has(node)));
  }

  private async resolveVisual(
    node: any,
    options: ImageManagerOptions,
  ): Promise<ResolvedVisual> {
    const oldUrl = node.data("resolvedImage") as string | undefined;
    const imagePath = node.data("thumbnail") || node.data("image");
    if (imagePath) {
      let url = this.urlCache.get(imagePath);
      if (!url) {
        url = (await options.resolveImageUrl(imagePath)) || "";
        if (url) this.urlCache.set(imagePath, url);
      }
      return { node, url, isSilhouette: false, skip: false, oldUrl };
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

    return { node, url: "", isSilhouette: false, skip: false, oldUrl };
  }

  /**
   * Resolves visuals through a small pool and paints them as they arrive.
   * Waiting for every image before applying any meant one slow host held up
   * the whole graph (11.8 s for 198 external images in one profile), and
   * hundreds of simultaneous fetches slowed each other down.
   */
  private async resolveAndApply(
    nodes: any[],
    { options, variant }: { options: ImageManagerOptions; variant: string },
  ) {
    const start = performance.now();
    const ready: ResolvedVisual[] = [];
    let applied = 0;
    let stopped = false;
    let flushTimer: ReturnType<typeof setTimeout> | undefined;

    const shouldStop = () =>
      stopped || this.cy.destroyed() || !options.showImages;

    const flush = () => {
      flushTimer = undefined;
      if (ready.length === 0) return;
      if (shouldStop()) {
        stopped = true;
        ready.length = 0;
        return;
      }
      const chunk = ready.splice(0, ready.length);
      this.cy.batch(() => {
        for (const visual of chunk) this.applyVisual(visual, variant, options);
      });
      this.cy.style().update();
      applied += chunk.length;
      options.onBatchApplied?.(chunk.length);
    };

    const scheduleFlush = () => {
      if (ready.length >= (options.batchSize ?? FLUSH_SIZE)) {
        if (flushTimer !== undefined) clearTimeout(flushTimer);
        flush();
      } else if (flushTimer === undefined) {
        flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
      }
    };

    let next = 0;
    const worker = async () => {
      while (next < nodes.length && !shouldStop()) {
        const node = nodes[next++];
        try {
          ready.push(await this.resolveVisual(node, options));
        } catch (err) {
          // One failed resolve must not lose the rest. The node stays
          // unstamped, so the next sync tries it again.
          options.onError?.(err);
        } finally {
          this.resolvingIds.delete(node.id());
        }
        scheduleFlush();
      }
    };

    try {
      await Promise.all(
        Array.from(
          { length: Math.min(RESOLVE_CONCURRENCY, nodes.length) },
          () => worker(),
        ),
      );
      if (flushTimer !== undefined) clearTimeout(flushTimer);
      flush();
      if (!stopped) {
        options.onLog?.(
          `[GraphImageManager] Resolved ${applied} node visuals in ${(performance.now() - start).toFixed(2)}ms`,
        );
      }
    } catch (err) {
      options.onError?.(err);
    } finally {
      if (flushTimer !== undefined) clearTimeout(flushTimer);
      // Anything the pool never reached (a destroyed graph, images switched
      // off) is released so a later sync can pick it up.
      for (const node of nodes) this.resolvingIds.delete(node.id());
    }
  }

  private applyVisual(
    { node, url, isSilhouette, oldUrl, skip }: ResolvedVisual,
    variant: string,
    options: ImageManagerOptions,
  ) {
    if (skip) return;
    const newUrl = url || "none"; // Mark as "none" to avoid infinite retries and prevent broken image states
    if (newUrl === oldUrl) return;

    const nodeId = node.id();
    const oldPath = this.nodePathMap.get(nodeId);
    if (oldPath) options.releaseImageUrl(oldPath);

    node.data("resolvedImage", newUrl);
    if (isSilhouette) {
      node.data("isSilhouette", true);
      node.data("appliedSilhouetteKey", this.getSilhouetteKey(node, variant));
    } else {
      node.removeData("isSilhouette");
      node.removeData("appliedSilhouetteKey");
    }
    const currentPath = node.data("thumbnail") || node.data("image");
    if (currentPath) this.nodePathMap.set(nodeId, currentPath);
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

  private clearImages(options?: ImageManagerOptions) {
    this.resolvingIds.clear();
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

  destroy(options?: ImageManagerOptions) {
    if (options) {
      this.nodePathMap.forEach((path) => {
        options.releaseImageUrl(path);
      });
    }
    this.urlCache.clear();
    this.nodePathMap.clear();
    this.resolvingIds.clear();
  }
}

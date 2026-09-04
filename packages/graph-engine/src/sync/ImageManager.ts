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

    // Bulk process all images and silhouettes concurrently
    void (async () => {
      try {
        const start = performance.now();
        const results = await Promise.all(
          nodesNeedingVisuals.map(async (node) => {
            const imagePath = node.data("thumbnail") || node.data("image");
            if (imagePath) {
              let url = this.urlCache.get(imagePath);
              if (!url) {
                url = (await options.resolveImageUrl(imagePath)) || "";
                if (url) this.urlCache.set(imagePath, url);
              }
              return {
                node,
                url,
                isSilhouette: false,
                skip: false,
                oldUrl: node.data("resolvedImage") as string | undefined,
              };
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
                oldUrl: node.data("resolvedImage") as string | undefined,
              };
            }

            return {
              node,
              url: "",
              isSilhouette: false,
              skip: false,
              oldUrl: node.data("resolvedImage") as string | undefined,
            };
          }),
        );

        if (this.cy.destroyed() || !options.showImages) {
          return;
        }

        // Apply in smaller batches to prevent massive style churn
        const batchSize = options.batchSize ?? 10;
        for (let i = 0; i < results.length; i += batchSize) {
          const chunk = results.slice(i, i + batchSize);
          this.cy.batch(() => {
            for (const { node, url, isSilhouette, oldUrl, skip } of chunk) {
              if (skip) continue;
              const newUrl = url || "none"; // Mark as "none" to avoid infinite retries and prevent broken image states
              if (newUrl !== oldUrl) {
                const nodeId = node.id();
                const oldPath = this.nodePathMap.get(nodeId);
                if (oldPath) {
                  options.releaseImageUrl(oldPath);
                }

                node.data("resolvedImage", newUrl);
                if (isSilhouette) {
                  node.data("isSilhouette", true);
                  node.data(
                    "appliedSilhouetteKey",
                    this.getSilhouetteKey(node, variant),
                  );
                } else {
                  node.removeData("isSilhouette");
                  node.removeData("appliedSilhouetteKey");
                }
                const currentPath =
                  node.data("thumbnail") || node.data("image");
                if (currentPath) {
                  this.nodePathMap.set(nodeId, currentPath);
                }
              }
            }
          });
        }

        this.cy.style().update();
        options.onLog?.(
          `[GraphImageManager] Resolved ${results.length} node visuals in ${(performance.now() - start).toFixed(2)}ms`,
        );
        options.onBatchApplied?.(results.length);
      } catch (err) {
        options.onError?.(err);
      } finally {
        nodesNeedingVisuals.forEach((n) => {
          this.resolvingIds.delete(n.id());
        });
      }
    })();
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

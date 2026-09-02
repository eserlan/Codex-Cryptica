import type { Core } from "cytoscape";

export interface ImageManagerOptions {
  showImages: boolean;
  resolveImageUrl: (path: string) => Promise<string | null>;
  releaseImageUrl: (path: string) => void;
  resolveSilhouetteUrl?: (node: any) => string | null;
  batchSize?: number;
  onBatchApplied?: (count: number) => void;
  onLog?: (message: string) => void;
  onError?: (error: any) => void;
}

export class GraphImageManager {
  private urlCache = new Map<string, string>();
  private resolvingIds = new Set<string>();
  private nodePathMap = new Map<string, string>();

  constructor(private cy: Core) {}

  sync(options: ImageManagerOptions) {
    if (!this.cy || this.cy.destroyed()) return;

    if (!options.showImages) {
      this.clearImages(options);
      return;
    }

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
                oldUrl: node.data("resolvedImage") as string | undefined,
              };
            }

            if (options.resolveSilhouetteUrl) {
              const silUrl = options.resolveSilhouetteUrl(node);
              return {
                node,
                url: silUrl || "",
                isSilhouette: true,
                oldUrl: node.data("resolvedImage") as string | undefined,
              };
            }

            return {
              node,
              url: "",
              isSilhouette: false,
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
            for (const { node, url, isSilhouette, oldUrl } of chunk) {
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
                    this.getSilhouetteKey(node),
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

  private getSilhouetteKey(node: any): string {
    const rawSil = node.data("silhouette") ?? "";
    const rawType = node.data("type") ?? "";
    const rawLabels = Array.isArray(node.data("labels"))
      ? node.data("labels").join(",")
      : "";
    const rawLabel =
      typeof node.data("label") === "string" ? node.data("label") : "";
    return `${rawSil}|${rawType}|${rawLabels}|${rawLabel}`;
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

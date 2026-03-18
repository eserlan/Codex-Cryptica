import type { Core } from "cytoscape";

export interface ImageManagerOptions {
  showImages: boolean;
  resolveImageUrl: (path: string) => Promise<string | null>;
  releaseImageUrl: (path: string) => void;
  batchSize?: number;
  onBatchApplied?: (count: number) => void;
  onLog?: (message: string) => void;
  onError?: (error: any) => void;
}

export class GraphImageManager {
  private resolvingIds = new Set<string>();
  private nodePathMap = new Map<string, string>();

  constructor(private cy: Core) {}

  sync(options: ImageManagerOptions) {
    if (!this.cy || this.cy.destroyed()) return;

    if (!options.showImages) {
      this.clearImages(options.releaseImageUrl);
      return;
    }

    const nodesWithImages = this.cy
      .nodes()
      .filter(
        (n) =>
          (n.data("image") || n.data("thumbnail")) &&
          !n.data("resolvedImage") &&
          !this.resolvingIds.has(n.id()),
      );

    if (nodesWithImages.length === 0) return;

    options.onLog?.(
      `[GraphImageManager] Syncing images for ${nodesWithImages.length} nodes...`,
    );

    // Mark them all as resolving immediately
    nodesWithImages.forEach((n) => {
      this.resolvingIds.add(n.id());
    });

    // Bulk process all images concurrently
    void (async () => {
      try {
        const start = performance.now();
        const results = await Promise.all(
          nodesWithImages.map(async (node) => {
            const imagePath = node.data("image") || node.data("thumbnail");
            // Always call resolveImageUrl to ensure central ref-counting is bumped per node
            const url = (await options.resolveImageUrl(imagePath)) || "";
            return {
              node,
              url,
              oldUrl: node.data("resolvedImage") as string | undefined,
            };
          }),
        );

        if (this.cy.destroyed() || !options.showImages) {
          // If destroyed/disabled while resolving, release what we just resolved
          results.forEach((r) => {
            const path = r.node.data("image") || r.node.data("thumbnail");
            if (path && r.url.startsWith("blob:")) {
              options.releaseImageUrl(path);
            }
            this.resolvingIds.delete(r.node.id());
          });
          return;
        }

        // Apply in smaller batches to prevent massive style churn
        const batchSize = options.batchSize ?? 10;
        for (let i = 0; i < results.length; i += batchSize) {
          const chunk = results.slice(i, i + batchSize);
          this.cy.batch(() => {
            for (const { node, url, oldUrl } of chunk) {
              const newUrl = url || "failed"; // Mark as failed to avoid infinite retries
              if (newUrl !== oldUrl) {
                const nodeId = node.id();
                const oldPath = this.nodePathMap.get(nodeId);
                if (oldPath) {
                  options.releaseImageUrl(oldPath);
                }

                node.data("resolvedImage", newUrl);
                const currentPath =
                  node.data("image") || node.data("thumbnail");
                if (currentPath) {
                  this.nodePathMap.set(nodeId, currentPath);
                }
                // URL revocation is now managed centrally by VaultStore to prevent ERR_FILE_NOT_FOUND
              }
            }
          });
        }

        this.cy.style().update();
        options.onLog?.(
          `[GraphImageManager] Resolved ${results.length} images in ${(performance.now() - start).toFixed(2)}ms`,
        );
        options.onBatchApplied?.(results.length);
      } catch (err) {
        options.onError?.(err);
        nodesWithImages.forEach((n) => {
          this.resolvingIds.delete(n.id());
        });
      }
    })();
  }

  private clearImages(releaseImageUrl: (path: string) => void) {
    this.resolvingIds.clear();
    this.cy
      .nodes()
      .filter((n) => n.data("resolvedImage"))
      .forEach((node) => {
        const nodeId = node.id();
        const path = this.nodePathMap.get(nodeId);
        if (path) {
          releaseImageUrl(path);
        }
        this.nodePathMap.delete(nodeId);
        node.removeData("resolvedImage");
      });
    this.cy.style().update();
  }

  destroy(releaseImageUrl?: (path: string) => void) {
    if (releaseImageUrl) {
      this.nodePathMap.forEach((path) => {
        releaseImageUrl(path);
      });
    }
    this.nodePathMap.clear();
    this.resolvingIds.clear();
  }
}

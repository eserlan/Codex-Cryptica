import type { Core } from "cytoscape";

export interface ImageManagerOptions {
  showImages: boolean;
  resolveImageUrl: (path: string) => Promise<string | null>;
  batchSize?: number;
  onBatchApplied?: (count: number) => void;
  onError?: (error: any) => void;
}

export class GraphImageManager {
  private urlCache = new Map<string, string>();
  private resolvingIds = new Set<string>();

  constructor(private cy: Core) {}

  sync(options: ImageManagerOptions) {
    if (!this.cy || this.cy.destroyed()) return;

    if (!options.showImages) {
      this.clearImages();
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

    // Mark them all as resolving immediately
    nodesWithImages.forEach((n) => {
      this.resolvingIds.add(n.id());
    });

    // Bulk process all images concurrently
    void (async () => {
      try {
        const results = await Promise.all(
          nodesWithImages.map(async (node) => {
            const imagePath = node.data("image") || node.data("thumbnail");
            let url = this.urlCache.get(imagePath);
            if (!url) {
              url = (await options.resolveImageUrl(imagePath)) || "";
              if (url) this.urlCache.set(imagePath, url);
            }
            return {
              node,
              url,
              oldUrl: node.data("resolvedImage") as string | undefined,
            };
          }),
        );

        if (this.cy.destroyed() || !options.showImages) {
          nodesWithImages.forEach((n) => {
            this.resolvingIds.delete(n.id());
          });
          return;
        }

        // Apply in smaller batches to prevent massive style churn
        const batchSize = options.batchSize ?? 10;
        for (let i = 0; i < results.length; i += batchSize) {
          const chunk = results.slice(i, i + batchSize);
          this.cy.batch(() => {
            for (const { node, url, oldUrl } of chunk) {
              if (url && url !== oldUrl) {
                node.data("resolvedImage", url);
                if (oldUrl?.startsWith("blob:")) {
                  URL.revokeObjectURL(oldUrl);
                }
              }
            }
          });
        }

        options.onBatchApplied?.(results.length);
      } catch (err) {
        options.onError?.(err);
        nodesWithImages.forEach((n) => {
          this.resolvingIds.delete(n.id());
        });
      }
    })();
  }

  private clearImages() {
    this.resolvingIds.clear();
    this.cy
      .nodes()
      .filter((n) => n.data("resolvedImage"))
      .forEach((node) => {
        const oldUrl = node.data("resolvedImage");
        if (oldUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(oldUrl);
        }
        node.removeData("resolvedImage");
      });
    this.cy.style().update();
  }

  destroy() {
    this.urlCache.forEach((url) => {
      if (url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    });
    this.urlCache.clear();
    this.resolvingIds.clear();
  }
}

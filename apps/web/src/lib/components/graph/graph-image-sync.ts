import {
  deriveEntityTypePalette,
  loadSilhouetteImageUrl,
  resolveEntitySilhouette,
} from "schema";
import type { GraphImageManager } from "graph-engine";
import type { graph as graphStore } from "#lib/stores/graph.svelte.js";
import type { vault as vaultStore } from "#lib/stores/vault.svelte.js";
import type { debugStore as debugStoreType } from "#lib/stores/debug.svelte.js";
import type { themeStore } from "#lib/stores/theme.svelte.js";
import { categories } from "#lib/stores/categories.svelte.js";

type ActiveTheme = typeof themeStore.activeTheme;
type CategoryList = typeof categories.list;

interface SyncGraphImagesOptions {
  imageManager: GraphImageManager;
  graph: Pick<typeof graphStore, "showImages" | "perfStylingActive">;
  vault: Pick<typeof vaultStore, "resolveThumbnailUrl" | "releaseThumbnailUrl">;
  debugStore: Pick<typeof debugStoreType, "log" | "error">;
  activeTheme: ActiveTheme;
  categoryList: CategoryList;
}

/** Applies graph image and silhouette policy for the current theme and graph state. */
export function syncGraphImages({
  imageManager,
  graph,
  vault,
  debugStore,
  activeTheme,
  categoryList,
}: SyncGraphImagesOptions): void {
  const palette = deriveEntityTypePalette(activeTheme, categoryList);
  const fallbackGlyph = activeTheme?.tokens?.primary || "#d4af37";

  imageManager.sync({
    showImages: graph.showImages && !graph.perfStylingActive,
    resolveImageUrl: (path) => vault.resolveThumbnailUrl(path),
    releaseImageUrl: (path: string) => vault.releaseThumbnailUrl(path),
    silhouetteVariant: JSON.stringify([
      activeTheme?.id ?? "",
      categoryList.map((category) => [category.id, category.color]),
    ]),
    resolveSilhouetteUrl: (node) => {
      const nodeData = node.data();
      const rawEntity = nodeData.entity || {
        id: node.id(),
        title:
          typeof nodeData.label === "string"
            ? nodeData.label.replace(/\*$/, "")
            : "",
        type: nodeData.type,
        labels: nodeData.labels,
        silhouette: nodeData.silhouette,
      };
      const silhouette = resolveEntitySilhouette(rawEntity, {
        worldTheme: activeTheme?.id,
      });
      const glyphColor = palette[String(nodeData.type)]?.glyph ?? fallbackGlyph;
      return loadSilhouetteImageUrl(silhouette, glyphColor);
    },
    onBatchApplied: (count) => {
      debugStore.log(`[GraphView] Applied ${count} visuals to graph nodes.`);
    },
    onLog: (message) => debugStore.log(message),
    onError: (error) =>
      debugStore.error("Incremental image resolution failed", error),
  });
}

/** Releases the manager's thumbnail references on a vault reset or teardown. */
export function releaseGraphImages(
  imageManager: GraphImageManager | undefined,
  vault: Pick<typeof vaultStore, "releaseThumbnailUrl">,
): void {
  imageManager?.destroy({
    releaseImageUrl: (path: string) => vault.releaseThumbnailUrl(path),
  } as Parameters<GraphImageManager["destroy"]>[0]);
}

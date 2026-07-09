import type { Core } from "cytoscape";
import type { GraphNode, GraphEdge } from "../transformer";
import type { LayoutRequest } from "../LayoutManager";

export interface SyncOptions {
  elements: (GraphNode | GraphEdge)[];
  vaultStatus:
    | "loading"
    | "idle"
    | "error"
    | "saving"
    | "saved"
    | "needs-permission";
  initialLoaded: boolean;
  isTemporalMetadataEqual: (a: any, b: any) => boolean;
  activeLabels?: Set<string>;
  labelFilterMode?: "AND" | "OR";
  activeCategories?: Set<string>;
  onFirstElements?: () => void;
  onLayoutUpdate?: (req: LayoutRequest) => void;
}

const isNodeRendered = (node: any) =>
  !node.hasClass("filtered-out") &&
  !node.hasClass("category-filtered-out") &&
  !node.hasClass("timeline-hidden");

const syncRenderedWeights = (
  elementMap: Map<string, any>,
  elements: (GraphNode | GraphEdge)[],
) => {
  const graphNodes: any[] = [];

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.group !== "nodes") continue;

    const node = elementMap.get(el.data.id);
    if (node) graphNodes.push(node);
  }

  const visibleNodeIds = new Set<string>();
  for (let i = 0; i < graphNodes.length; i++) {
    const node = graphNodes[i];
    if (isNodeRendered(node)) visibleNodeIds.add(node.id());
  }

  for (let i = 0; i < graphNodes.length; i++) {
    const node = graphNodes[i];
    let nextWeight = 0;

    if (visibleNodeIds.has(node.id())) {
      const connectedEdges = node.connectedEdges();
      for (let j = 0; j < connectedEdges.length; j++) {
        const edge = connectedEdges[j];
        const sourceId = edge.source().id();
        const targetId = edge.target().id();
        if (visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId)) {
          nextWeight++;
        }
      }
    }

    if (node.data("weight") !== nextWeight) {
      node.data("weight", nextWeight);
    }
  }
};

/**
 * Pass 1 — Reconcile existing elements against the target set.
 * Partitions current cy elements into a reusable `elementMap` (kept) and
 * `elementsToRemove` (stale), removing the stale ones in a single batch.
 */
function reconcileElements(
  cy: Core,
  elements: (GraphNode | GraphEdge)[],
): { elementMap: Map<string, any>; elementsToRemove: any[] } {
  const targetIds = new Set(elements.map((el) => el.data.id));
  const elementMap = new Map<string, any>();
  const elementsToRemove: any[] = [];

  cy.elements().forEach((el) => {
    const id = el.id();
    if (!targetIds.has(id)) elementsToRemove.push(el);
    else elementMap.set(id, el);
  });

  if (elementsToRemove.length > 0) cy.remove(cy.collection(elementsToRemove));

  return { elementMap, elementsToRemove };
}

/**
 * Pass 2 — Add elements present in the target set but absent from cy.
 * New nodes are tagged `pending-layout` and seeded with any supplied position;
 * edges are only added once both endpoints exist. Newly added elements are
 * registered in `elementMap` so the data/filter pass can reach them.
 */
function addNewElements(
  cy: Core,
  elements: (GraphNode | GraphEdge)[],
  elementMap: Map<string, any>,
): { newNodes: GraphNode[] } {
  const newNodes: GraphNode[] = [];
  const newEdges: GraphEdge[] = [];
  elements.forEach((el) => {
    if (!elementMap.has(el.data.id)) {
      if (!("source" in el.data)) {
        newNodes.push(el as GraphNode);
      } else {
        newEdges.push(el as GraphEdge);
      }
    }
  });

  if (newNodes.length > 0 || newEdges.length > 0) {
    if (newNodes.length > 0) {
      // ⚡ Bolt Optimization: Replace O(N^2) nested .forEach + .find with an O(N) Map lookup.
      // This avoids N array iterations when applying initial node positions.
      const newNodesMap = new Map();
      for (let i = 0; i < newNodes.length; i++) {
        if (!newNodesMap.has(newNodes[i].data.id)) {
          newNodesMap.set(newNodes[i].data.id, newNodes[i]);
        }
      }

      const addedNodes = cy.add(newNodes);
      addedNodes.addClass("pending-layout");

      addedNodes.forEach((n) => {
        elementMap.set(n.id(), n);
        const originalNode = newNodesMap.get(n.id());
        if (originalNode && originalNode.position) {
          n.position(originalNode.position);
        }
      });
    }
    const validEdges = newEdges.filter((edge) => {
      const sourceId = edge.data.source!;
      const targetId = edge.data.target!;
      return cy && cy.$id(sourceId).nonempty() && cy.$id(targetId).nonempty();
    });
    if (validEdges.length > 0) {
      cy.add(validEdges).forEach((e) => {
        elementMap.set(e.id(), e);
      });
    }
  }

  return { newNodes };
}

/**
 * Incremental data patch for a single element. Diffs `el.data` against the live
 * cy node data and only writes the keys that actually changed (with bespoke
 * equality for temporal metadata, arrays, coordinates and metadata objects),
 * then strips keys that no longer exist.
 */
function patchElementData(
  node: any,
  el: GraphNode | GraphEdge,
  isTemporalMetadataEqual: (a: any, b: any) => boolean,
) {
  const currentData = node.data();
  const newData = el.data as Record<string, any>;
  const patch: Record<string, any> = {};
  let hasChanges = false;

  for (const k in newData) {
    if (k === "id" || !Object.hasOwn(newData, k)) continue;

    // Bugfix: Do not re-apply isPendingLayout to existing nodes.
    // This prevents nodes that were already placed by LayoutManager from
    // becoming invisible just because Svelte hasn't saved their coordinates yet.
    if (k === "isPendingLayout") continue;

    const newVal = newData[k];
    const curVal = currentData[k];
    let isMatch = newVal === curVal;

    if (!isMatch) {
      if (
        el.group === "nodes" &&
        (k === "date" || k === "start_date" || k === "end_date")
      )
        isMatch = isTemporalMetadataEqual(newVal, curVal);
      else if (Array.isArray(newVal))
        isMatch =
          Array.isArray(curVal) &&
          newVal.length === curVal.length &&
          newVal.every((v, i) => v === curVal[i]);
      else if (
        typeof newVal === "object" &&
        newVal !== null &&
        curVal !== null &&
        typeof curVal === "object"
      ) {
        if (k === "coordinates")
          isMatch = newVal.x === curVal.x && newVal.y === curVal.y;
        else if (k === "metadata")
          isMatch =
            !!curVal &&
            newVal.coordinates?.x === curVal.coordinates?.x &&
            newVal.coordinates?.y === curVal.coordinates?.y &&
            newVal.isRevealed === curVal.isRevealed;
      }
    }

    if (!isMatch) {
      patch[k] = newVal;
      hasChanges = true;
    }
  }

  // Remove keys that no longer exist in newData (e.g. isPendingLayout)
  for (const k in currentData) {
    if (k !== "id" && !Object.hasOwn(newData, k)) {
      // Bugfix: Do not strip internal cytoscape properties managed by other components
      if (k === "resolvedImage") continue;

      node.removeData(k);
      // If the source image path is removed, clear the resolved image so ImageManager can clean up
      if (k === "image" || k === "thumbnail") {
        node.removeData("resolvedImage");
      }
    }
  }

  if (hasChanges) {
    node.data(patch);
    // If the image or thumbnail properties changed, clear the resolvedImage
    // so that ImageManager is forced to re-fetch and apply the new one.
    if ("image" in patch || "thumbnail" in patch) {
      node.removeData("resolvedImage");
    }
  }
}

interface FilterContext {
  /** Active labels, pre-lowercased once per sync. */
  labels: string[];
  labelFilterMode?: "AND" | "OR";
  activeCategories?: Set<string>;
  /** Reused scratch buffer for lowercasing node labels (avoids per-node allocation). */
  lowerScratch: string[];
}

/**
 * Apply category + label visibility classes to a single node. Edges are skipped.
 */
function applyFilterClasses(
  node: any,
  el: GraphNode | GraphEdge,
  ctx: FilterContext,
) {
  if (el.group !== "nodes") return;
  const { labels, labelFilterMode, activeCategories, lowerScratch } = ctx;

  // Category Filter
  if (activeCategories && activeCategories.size > 0) {
    if (activeCategories.has(el.data.type as string)) {
      node.removeClass("category-filtered-out");
    } else {
      node.addClass("category-filtered-out");
    }
  } else {
    node.removeClass("category-filtered-out");
  }

  // Label Filter
  if (labels.length > 0 && el.data.labels) {
    const nodeLabels = el.data.labels as string[];
    lowerScratch.length = nodeLabels.length;
    for (let j = 0; j < nodeLabels.length; j++) {
      lowerScratch[j] = nodeLabels[j].toLowerCase();
    }

    let hasMatch = false;
    if (labelFilterMode === "AND") {
      hasMatch = true;
      for (let i = 0; i < labels.length; i++) {
        if (!lowerScratch.includes(labels[i])) {
          hasMatch = false;
          break;
        }
      }
    } else {
      for (let i = 0; i < labels.length; i++) {
        if (lowerScratch.includes(labels[i])) {
          hasMatch = true;
          break;
        }
      }
    }

    if (hasMatch) {
      node.removeClass("filtered-out");
    } else {
      node.addClass("filtered-out");
    }
  } else if (labels.length > 0) {
    node.addClass("filtered-out");
  } else {
    node.removeClass("filtered-out");
  }
}

/**
 * Pass 3 — Incremental data sync + filtering, in one cy.batch.
 * Patches changed data and (re)applies visibility classes per element, then
 * recomputes rendered edge weights from the now-filtered graph.
 */
function syncDataAndFilters(
  cy: Core,
  elements: (GraphNode | GraphEdge)[],
  elementMap: Map<string, any>,
  options: SyncOptions,
) {
  const {
    isTemporalMetadataEqual,
    activeLabels,
    labelFilterMode,
    activeCategories,
  } = options;

  cy.batch(() => {
    const ctx: FilterContext = {
      labels: activeLabels
        ? Array.from(activeLabels).map((l) => l.toLowerCase())
        : [],
      labelFilterMode,
      activeCategories,
      lowerScratch: [],
    };

    elements.forEach((el) => {
      const node = elementMap.get(el.data.id);
      if (!node) return;

      patchElementData(node, el, isTemporalMetadataEqual);
      applyFilterClasses(node, el, ctx);
    });

    syncRenderedWeights(elementMap, elements);
  });
}

export function resolveLayoutTrigger(
  isFirstElements: boolean,
  hasDeletions: boolean,
  hasNewNodes: boolean,
  isVaultLoading: boolean,
  initialLoaded: boolean,
  elementsToRemove: { isNode: () => boolean }[],
): LayoutRequest | null {
  if (!hasNewNodes && !hasDeletions && !isFirstElements) return null;
  if (isFirstElements) return null; // handled by onFirstElements + cy.fit
  if (isVaultLoading) return null;
  const hasRemovedNodes = elementsToRemove.some((el) => el.isNode());
  return {
    reason: "Elements Update",
    isForced: hasDeletions,
    hasNewNodes,
    hasRemovedNodes,
  };
}

export function syncGraphElements(cy: Core, options: SyncOptions) {
  const { elements, vaultStatus, initialLoaded } = options;
  const isVaultLoading = vaultStatus === "loading";

  try {
    // Pass 1: reconcile + remove stale. Pass 2: add new. Pass 3: patch data + filters.
    const { elementMap, elementsToRemove } = reconcileElements(cy, elements);
    const { newNodes } = addNewElements(cy, elements, elementMap);
    syncDataAndFilters(cy, elements, elementMap, options);

    const isFirstElements = !initialLoaded && elements.length > 0;
    const hasDeletions = elementsToRemove.length > 0;
    const hasNewNodes = newNodes.length > 0;

    if (hasNewNodes || hasDeletions || isFirstElements) {
      if (isFirstElements) {
        options.onFirstElements?.();
        (cy as any).fit(undefined, 40);
      } else {
        const req = resolveLayoutTrigger(
          isFirstElements,
          hasDeletions,
          hasNewNodes,
          isVaultLoading,
          initialLoaded,
          elementsToRemove,
        );
        if (req) options.onLayoutUpdate?.(req);
      }
    }
  } catch (err) {
    console.error("[GraphSync] Error syncing elements", err);
  }
}

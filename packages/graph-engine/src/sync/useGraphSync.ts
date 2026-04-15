import type { Core } from "cytoscape";
import type { GraphNode, GraphEdge } from "../transformer";

export interface SyncOptions {
  elements: (GraphNode | GraphEdge)[];
  vaultStatus: "loading" | "idle" | "error" | "saving";
  initialLoaded: boolean;
  isTemporalMetadataEqual: (a: any, b: any) => boolean;
  activeLabels?: Set<string>;
  labelFilterMode?: "AND" | "OR";
  activeCategories?: Set<string>;
  onFirstElements?: () => void;
  onLayoutUpdate?: (
    isInitial: boolean,
    isForced: boolean,
    caller: string,
  ) => void;
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

export function syncGraphElements(cy: Core, options: SyncOptions) {
  const {
    elements,
    vaultStatus,
    initialLoaded,
    isTemporalMetadataEqual,
    activeLabels,
    labelFilterMode,
    activeCategories,
  } = options;
  const isVaultLoading = vaultStatus === "loading";

  try {
    const targetIds = new Set(elements.map((el) => el.data.id));
    const elementMap = new Map();
    const elementsToRemove: any[] = [];

    cy.elements().forEach((el) => {
      const id = el.id();
      if (!targetIds.has(id)) elementsToRemove.push(el);
      else elementMap.set(id, el);
    });

    if (elementsToRemove.length > 0) cy.remove(cy.collection(elementsToRemove));

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

    // Incremental Data Sync & Filtering
    cy.batch(() => {
      // Setup filtering context
      const labels = activeLabels
        ? Array.from(activeLabels).map((l) => l.toLowerCase())
        : [];
      const lowerScratch: string[] = [];

      elements.forEach((el) => {
        const node = elementMap.get(el.data.id);
        if (!node) return;

        // Sync Data
        const currentData = node.data();
        const newData = el.data as Record<string, any>;
        const patch: Record<string, any> = {};
        let hasChanges = false;

        for (const k in newData) {
          if (k === "id" || !Object.hasOwn(newData, k)) continue;

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
        if (hasChanges) node.data(patch);

        // Apply Filtering Classes
        if (el.group === "nodes") {
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
      });

      syncRenderedWeights(elementMap, elements);
    });

    const isFirstElements = !initialLoaded && elements.length > 0;
    const hasDeletions = elementsToRemove.length > 0;
    const hasNewEdges = newEdges.length > 0;
    const hasNewNodes = newNodes.length > 0;

    if (hasNewNodes || hasNewEdges || hasDeletions || isFirstElements) {
      if (isFirstElements) {
        options.onFirstElements?.();
        const w = cy.width();
        const h = cy.height();
        cy.viewport({ zoom: 0.15, pan: { x: w / 2, y: h / 2 } });
      } else if (!isVaultLoading || initialLoaded) {
        // Force layout if we have deletions or new edges to ensure constraints are respected
        const force = hasDeletions || hasNewEdges;
        options.onLayoutUpdate?.(false, force, "Elements Update");
      }
    }
  } catch (err) {
    console.error("[GraphSync] Error syncing elements", err);
  }
}
